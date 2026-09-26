import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildAuthorizeUrl,
  mapFeishuUser,
  parseAuthConfig,
} from '../server-local/feishu-auth.mjs';

test('buildAuthorizeUrl creates a Feishu login URL with callback and state', () => {
  const url = new URL(buildAuthorizeUrl({
    appId: 'cli_test',
    redirectUri: 'http://127.0.0.1:3001/auth/callback',
    state: 'state-value',
  }));

  assert.equal(url.origin, 'https://accounts.feishu.cn');
  assert.equal(url.pathname, '/open-apis/authen/v1/authorize');
  assert.equal(url.searchParams.get('app_id'), 'cli_test');
  assert.equal(url.searchParams.get('redirect_uri'), 'http://127.0.0.1:3001/auth/callback');
  assert.equal(url.searchParams.get('state'), 'state-value');
});

test('mapFeishuUser keeps the verified identity fields needed by the workbench', () => {
  assert.deepEqual(mapFeishuUser({
    name: '槅桃',
    avatar_url: 'https://example.test/avatar.png',
    open_id: 'ou_123',
    union_id: 'on_456',
    tenant_key: 'tenant_789',
  }), {
    name: '槅桃',
    avatarUrl: 'https://example.test/avatar.png',
    openId: 'ou_123',
    unionId: 'on_456',
    tenantKey: 'tenant_789',
  });
});

test('parseAuthConfig reports missing credentials without exposing a secret', () => {
  const config = parseAuthConfig({
    FEISHU_APP_ID: 'cli_test',
    FEISHU_APP_SECRET: '',
  });

  assert.equal(config.configured, false);
  assert.deepEqual(config.missing, ['FEISHU_APP_SECRET']);
  assert.equal('appSecret' in config.publicConfig, false);
});

test('local workbench exposes real Feishu login and logout controls', async () => {
  const [bridge, adapter] = await Promise.all([
    readFile(new URL('../client/src/v9-bridge.ts', import.meta.url), 'utf8'),
    readFile(new URL('../client/v9-source/live-adapter.js', import.meta.url), 'utf8'),
  ]);

  assert.match(bridge, /\/auth\/status/);
  assert.match(bridge, /hm-auth-ready/);
  assert.match(adapter, /data-live-act="feishu-login"/);
  assert.match(adapter, /data-live-act="feishu-logout"/);
});
