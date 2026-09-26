import { createHash, randomBytes } from 'node:crypto';

const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:3001/auth/callback';
const DEFAULT_FRONTEND_URL = 'http://127.0.0.1:8080/client/index.html';

export function parseAuthConfig(env = process.env) {
  const appId = env.FEISHU_APP_ID?.trim() || '';
  const appSecret = env.FEISHU_APP_SECRET?.trim() || '';
  const redirectUri = env.FEISHU_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;
  const frontendUrl = env.LOCAL_FRONTEND_URL?.trim() || DEFAULT_FRONTEND_URL;
  const missing = [
    ['FEISHU_APP_ID', appId],
    ['FEISHU_APP_SECRET', appSecret],
  ].filter(([, value]) => !value).map(([name]) => name);

  return {
    appId,
    appSecret,
    redirectUri,
    frontendUrl,
    configured: missing.length === 0,
    missing,
    publicConfig: { configured: missing.length === 0, missing, redirectUri, frontendUrl },
  };
}

export function buildAuthorizeUrl({ appId, redirectUri, state }) {
  const url = new URL('https://accounts.feishu.cn/open-apis/authen/v1/authorize');
  url.searchParams.set('app_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export function mapFeishuUser(user) {
  return {
    name: user.name || user.en_name || '飞书用户',
    avatarUrl: user.avatar_url || user.avatar_thumb || '',
    openId: user.open_id || '',
    unionId: user.union_id || '',
    tenantKey: user.tenant_key || '',
  };
}

export function newOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export function tokenDigest(value) {
  return createHash('sha256').update(value).digest('base64url');
}

export async function exchangeCode(config, code, fetchImpl = fetch) {
  const response = await fetchImpl('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.appId,
      client_secret: config.appSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });
  const payload = await response.json();
  const accessToken = payload.access_token || payload.data?.access_token;
  if (!response.ok || !accessToken) {
    throw new Error(payload.error_description || payload.msg || '飞书授权码交换失败');
  }
  return accessToken;
}

export async function fetchFeishuUser(accessToken, fetchImpl = fetch) {
  const response = await fetchImpl('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const payload = await response.json();
  const user = payload.data || payload;
  if (!response.ok || payload.code && payload.code !== 0 || !user.open_id) {
    throw new Error(payload.msg || '获取飞书用户身份失败');
  }
  return mapFeishuUser(user);
}
