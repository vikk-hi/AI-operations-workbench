import http from 'node:http';
import process from 'node:process';
import path from 'node:path';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

import {
  buildAuthorizeUrl,
  exchangeCode,
  fetchFeishuUser,
  newOpaqueToken,
  parseAuthConfig,
  tokenDigest,
} from './feishu-auth.mjs';
import { createBitableClient } from './bitable/client.mjs';
import { loadBitableConfig } from './bitable/config.mjs';
import { createTokenProvider } from './bitable/token-provider.mjs';
import { createCoreRepository } from './repositories/core-repository.mjs';
import { createTaskRepository } from './repositories/task-repository.mjs';
import { createTargetRepository } from './repositories/target-repository.mjs';
import { createTimelineRepository } from './repositories/timeline-repository.mjs';
import { createWorkbenchApi } from './workbench-api.mjs';

for (const candidate of [path.resolve('.env.local'), path.resolve('../..', '.env.local')]) {
  if (existsSync(candidate)) { dotenv.config({ path: candidate, quiet: true }); break; }
}
dotenv.config({ path: '.env' });

const config = parseAuthConfig();
const bitableConfig = loadBitableConfig();
const port = Number(process.env.LOCAL_AUTH_PORT || 3001);
const sessions = new Map();
const states = new Map();
const bitableClient = createBitableClient({ tokenProvider: createTokenProvider(bitableConfig) });
const workbenchApi = createWorkbenchApi({
  core: createCoreRepository({ client: bitableClient, source: bitableConfig.sources.core }),
  tasks: createTaskRepository({ client: bitableClient, source: bitableConfig.sources.tasks }),
  targets: createTargetRepository({ client: bitableClient, source: bitableConfig.sources.companyTargets }),
  timeline: createTimelineRepository({ client: bitableClient, source: bitableConfig.sources.timeline }),
}, {
  cacheTtlMs: bitableConfig.cacheTtlMs,
  sources: {
    sources: Object.values(bitableConfig.sources).filter((source) => source.enabled).map((source) => ({
      key: source.key, label: source.label,
      baseUrl: `https://qingmutec.feishu.cn/base/${source.appToken}?table=${source.tableId}`,
      tableName: source.label, mode: 'continuous-sync', readOnlyOriginal: true,
    })),
    replacementRule: '本地通过飞书开放 API 只读访问原始多维表格，不依赖妙搭数据库',
  },
});

const cookie = (request, name) => {
  const item = (request.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
};
const json = (response, status, body, origin) => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
  });
  response.end(JSON.stringify(body));
};
const redirect = (response, location, cookies = []) => {
  response.writeHead(302, { location, 'set-cookie': cookies });
  response.end();
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const allowedOrigin = new URL(config.frontendUrl).origin;
  const origin = request.headers.origin === allowedOrigin ? allowedOrigin : allowedOrigin;

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    });
    return response.end();
  }

  if (request.method === 'GET' && url.pathname === '/auth/status') {
    const sessionId = cookie(request, 'hm_feishu_session');
    const user = sessionId ? sessions.get(tokenDigest(sessionId)) : null;
    return json(response, 200, user
      ? { authenticated: true, user, configured: config.configured }
      : { authenticated: false, ...config.publicConfig }, origin);
  }

  if (request.method === 'GET' && url.pathname === '/auth/login') {
    if (!config.configured) return json(response, 503, config.publicConfig, origin);
    const state = newOpaqueToken();
    states.set(tokenDigest(state), Date.now() + 10 * 60 * 1000);
    return redirect(response, buildAuthorizeUrl({ ...config, state }), [
      `hm_feishu_state=${encodeURIComponent(state)}; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=600`,
    ]);
  }

  if (request.method === 'GET' && url.pathname === '/auth/callback') {
    const state = url.searchParams.get('state') || '';
    const expectedState = cookie(request, 'hm_feishu_state');
    const expiry = states.get(tokenDigest(state));
    states.delete(tokenDigest(state));
    if (!state || state !== expectedState || !expiry || expiry < Date.now()) {
      return json(response, 400, { error: '飞书登录状态已失效，请重新登录' }, origin);
    }
    const code = url.searchParams.get('code');
    if (!code) return json(response, 400, { error: '飞书未返回授权码' }, origin);
    try {
      const accessToken = await exchangeCode(config, code);
      const user = await fetchFeishuUser(accessToken);
      const sessionId = newOpaqueToken();
      sessions.set(tokenDigest(sessionId), user);
      return redirect(response, `${config.frontendUrl}${config.frontendUrl.includes('?') ? '&' : '?'}feishu_login=success`, [
        `hm_feishu_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`,
        'hm_feishu_state=; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=0',
      ]);
    } catch (error) {
      const message = encodeURIComponent(error instanceof Error ? error.message : '登录失败');
      return redirect(response, `${config.frontendUrl}${config.frontendUrl.includes('?') ? '&' : '?'}feishu_login_error=${message}`);
    }
  }

  if (request.method === 'POST' && url.pathname === '/auth/logout') {
    const sessionId = cookie(request, 'hm_feishu_session');
    if (sessionId) sessions.delete(tokenDigest(sessionId));
    response.setHeader('set-cookie', 'hm_feishu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return json(response, 200, { ok: true }, origin);
  }

  if (url.pathname.startsWith('/api/workbench/')) {
    const sessionId = cookie(request, 'hm_feishu_session');
    const user = sessionId ? sessions.get(tokenDigest(sessionId)) : null;
    const viewer = user ? { id: user.openId, name: user.name, role: 'member' } : null;
    const result = await workbenchApi.handle(request.method || 'GET', url.pathname, viewer);
    return json(response, result.status, result.body, origin);
  }

  return json(response, 404, { error: 'Not found' }, origin);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[local-auth] http://127.0.0.1:${port}`);
  console.log(config.configured
    ? '[local-auth] 飞书登录已配置'
    : `[local-auth] 待配置: ${config.missing.join(', ')}`);
});
