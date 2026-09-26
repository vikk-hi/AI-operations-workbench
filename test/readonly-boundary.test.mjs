import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { loadBitableConfig } from '../server-local/bitable/config.mjs';

test('writeback remains limited to task create and update while credentials stay ignored', async () => {
  const [client, api, authServer, gitignore] = await Promise.all([
    readFile(new URL('../server-local/bitable/client.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../server-local/workbench-api.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../server-local/auth-server.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
  ]);
  assert.match(client, /updateRecord/);
  assert.match(client, /createRecord/);
  assert.match(api, /api\\\/workbench\\\/tasks/);
  assert.match(api, /createTask/);
  assert.doesNotMatch(api, /deleteTask|createTimelineItem|updateTimelineItem|deleteTimelineItem/);
  assert.match(authServer, /readJsonBody/);
  assert.match(gitignore, /\.env\.local/);
});

test('source metadata marks only task field updates as writable', () => {
  const config = loadBitableConfig({ FEISHU_APP_ID: 'cli_test', FEISHU_APP_SECRET: 'secret' });
  assert.equal(config.sources.tasks.writable, true);
  assert.equal(config.sources.timeline.writable, false);
});
