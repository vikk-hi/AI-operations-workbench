import assert from 'node:assert/strict';
import test from 'node:test';

import { loadBitableConfig, resolveSource } from '../server-local/bitable/config.mjs';

const env = {
  FEISHU_APP_ID: 'cli_test',
  FEISHU_APP_SECRET: 'secret-value',
};

test('loads only allowlisted sources', () => {
  const config = loadBitableConfig(env);

  assert.equal(resolveSource(config, 'core').appToken, 'M1z2bWhVhahRlDsBUG1cDQUwnRg');
  assert.equal(resolveSource(config, 'core').tableId, 'tblxTrxDK5lGJxlo');
  assert.equal(resolveSource(config, 'tasks').appToken, 'O4XhbiUw2aa5yRsgR8fckrNpnXe');
  assert.equal(resolveSource(config, 'tasks').tableId, 'tbl1Hi7UvvXTzTiQ');
  assert.equal(resolveSource(config, 'timeline').tableId, 'tbl2bLwV4QSLDVYL');
  assert.equal(resolveSource(config, 'tasks').writable, true);
  assert.equal(resolveSource(config, 'timeline').writable, true);
  assert.equal(resolveSource(config, 'core').writable, false);
  assert.equal(resolveSource(config, 'companyTargets').tableId, 'tbl74NgTMPJdwQXH');
  assert.equal(config.sources.coreHistory.enabled, false);
  assert.equal(config.sources.taskTemplates.enabled, false);
  assert.equal(config.sources.brandTargets.enabled, false);
  assert.equal(config.sources.taskMain.enabled, false);
});

test('rejects missing credentials without exposing secret', () => {
  const config = loadBitableConfig({ FEISHU_APP_ID: 'cli_test', FEISHU_APP_SECRET: '' });
  const serialized = JSON.stringify(config.publicStatus);

  assert.equal(config.publicStatus.configured, false);
  assert.deepEqual(config.publicStatus.missing, ['FEISHU_APP_SECRET']);
  assert.equal(serialized.includes('secret-value'), false);
  assert.equal(/appSecret|accessToken|app_access_token/i.test(serialized), false);
});

test('rejects unknown source key', () => {
  const config = loadBitableConfig(env);

  assert.throws(() => resolveSource(config, 'user-supplied-table'), /not allowlisted/i);
  assert.throws(() => resolveSource(config, 'coreHistory'), /not enabled/i);
});
