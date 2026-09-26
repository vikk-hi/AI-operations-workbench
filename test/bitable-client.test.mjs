import assert from 'node:assert/strict';
import test from 'node:test';

import { createBitableClient } from '../server-local/bitable/client.mjs';
import { createTokenProvider } from '../server-local/bitable/token-provider.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

test('token provider caches a token before expiry', async () => {
  let calls = 0;
  const provider = createTokenProvider(
    { appId: 'cli_test', appSecret: 'secret-value' },
    async () => { calls += 1; return json({ code: 0, app_access_token: 'token-one', expire: 7200 }); },
  );

  assert.equal(await provider.getToken(), 'token-one');
  assert.equal(await provider.getToken(), 'token-one');
  assert.equal(calls, 1);
});

test('client refreshes once after an authorization failure', async () => {
  let generation = 0;
  const provider = {
    async getToken() { generation += 1; return `token-${generation}`; },
    invalidate() {},
  };
  const seen = [];
  const client = createBitableClient({ tokenProvider: provider, fetchImpl: async (_url, init) => {
    seen.push({ method: init.method, authorization: init.headers.authorization });
    return seen.length === 1 ? json({ code: 99991663, msg: 'token invalid' }, 401) : json({ code: 0, data: { items: [] } });
  } });

  assert.deepEqual(await client.listTables('app_token'), []);
  assert.deepEqual(seen, [
    { method: 'GET', authorization: 'Bearer token-1' },
    { method: 'GET', authorization: 'Bearer token-2' },
  ]);
});

test('client reads every record page exactly once', async () => {
  const first = Array.from({ length: 500 }, (_, index) => ({ record_id: `rec_${index}`, fields: {} }));
  const urls = [];
  const client = createBitableClient({
    tokenProvider: { async getToken() { return 'token'; }, invalidate() {} },
    fetchImpl: async (url, init) => {
      assert.equal(init.method, 'GET');
      urls.push(String(url));
      return urls.length === 1
        ? json({ code: 0, data: { items: first, has_more: true, page_token: 'next-page' } })
        : json({ code: 0, data: { items: [{ record_id: 'rec_500', fields: {} }, { record_id: 'rec_501', fields: {} }], has_more: false } });
    },
  });

  const records = await client.listAllRecords('app_token', 'table_id', { pageSize: 500 });
  assert.equal(records.length, 502);
  assert.equal(urls.length, 2);
  assert.match(urls[1], /page_token=next-page/);
});

test('client normalizes rate limits and redacts credentials', async () => {
  const client = createBitableClient({
    tokenProvider: { async getToken() { return 'sensitive-token'; }, invalidate() {} },
    fetchImpl: async () => json({ code: 99991400, msg: 'rate limited sensitive-token secret-value' }, 429),
  });

  await assert.rejects(client.listFields('app_token', 'table_id'), (error) => {
    assert.equal(error.kind, 'rate_limited');
    assert.equal(error.message.includes('sensitive-token'), false);
    assert.equal(error.message.includes('secret-value'), false);
    return true;
  });
});

test('client exposes no mutation methods', () => {
  const client = createBitableClient({
    tokenProvider: { async getToken() { return 'token'; }, invalidate() {} },
    fetchImpl: async () => json({ code: 0, data: { items: [] } }),
  });

  assert.equal(client.createRecord, undefined);
  assert.equal(client.updateRecord, undefined);
  assert.equal(client.deleteRecord, undefined);
});
