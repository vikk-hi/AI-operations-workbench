import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('writeback remains limited to existing task updates while credentials stay ignored', async () => {
  const [client, api, authServer, gitignore] = await Promise.all([
    readFile(new URL('../server-local/bitable/client.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../server-local/workbench-api.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../server-local/auth-server.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
  ]);
  assert.match(client, /updateRecord/);
  assert.match(api, /api\\\/workbench\\\/tasks/);
  assert.doesNotMatch(api, /createTask|deleteTask|createTimelineItem|updateTimelineItem|deleteTimelineItem/);
  assert.match(authServer, /readJsonBody/);
  assert.match(gitignore, /\.env\.local/);
});
