import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Bitable connector and workbench routes expose no mutation path', async () => {
  const [client, api, authServer, gitignore] = await Promise.all([
    readFile(new URL('../server-local/bitable/client.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../server-local/workbench-api.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../server-local/auth-server.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(client, /createRecord|updateRecord|deleteRecord/);
  assert.match(api, /method !== 'GET'/);
  assert.doesNotMatch(authServer, /request\.method === '(?:POST|PATCH|DELETE)' && url\.pathname\.startsWith\('\/api\/workbench/);
  assert.match(gitignore, /\.env\.local/);
});
