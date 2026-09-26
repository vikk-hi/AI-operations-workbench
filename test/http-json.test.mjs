import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { readJsonBody } from '../server-local/http-json.mjs';

test('reads a bounded JSON object request body', async () => {
  const request = Readable.from(['{"title":"新任务"}']);
  assert.deepEqual(await readJsonBody(request), { title: '新任务' });
});

test('rejects malformed, non-object and oversized request bodies', async () => {
  await assert.rejects(readJsonBody(Readable.from(['{bad'])), /JSON/);
  await assert.rejects(readJsonBody(Readable.from(['[]'])), /JSON 对象/);
  await assert.rejects(readJsonBody(Readable.from(['123456']), { maxBytes: 5 }), /过大/);
});
