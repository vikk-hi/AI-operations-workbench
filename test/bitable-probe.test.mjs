import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProbeReport } from '../scripts/probe-bitable.mjs';

test('probe returns metadata and at most three record ids without field values', async () => {
  const client = {
    async listTables() { return [{ table_id: 'tbl_1', name: '任务表' }]; },
    async listFields() { return [{ field_id: 'fld_1', field_name: '任务', type: 1 }]; },
    async listRecordIds(_appToken, _tableId, options) {
      assert.equal(options.limit, 3);
      return ['rec_1', 'rec_2', 'rec_3'];
    },
  };
  const config = {
    sources: {
      tasks: { key: 'tasks', label: '执行任务', appToken: 'base_1', tableId: 'tbl_1', enabled: true },
    },
  };

  const report = await buildProbeReport(config, client, '2026-09-26T00:00:00.000Z');
  assert.deepEqual(report.enabledSources[0].sampleRecordIds, ['rec_1', 'rec_2', 'rec_3']);
  assert.equal(JSON.stringify(report).includes('record-secret'), false);
});
