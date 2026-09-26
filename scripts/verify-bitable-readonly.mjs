import path from 'node:path';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

import { createBitableClient } from '../server-local/bitable/client.mjs';
import { loadBitableConfig } from '../server-local/bitable/config.mjs';
import { createTokenProvider } from '../server-local/bitable/token-provider.mjs';

for (const candidate of [path.resolve('.env.local'), path.resolve('../..', '.env.local')]) {
  if (existsSync(candidate)) { dotenv.config({ path: candidate, quiet: true }); break; }
}

const config = loadBitableConfig();
if (!config.publicStatus.configured) throw new Error(`Missing local configuration: ${config.publicStatus.missing.join(', ')}`);
const client = createBitableClient({ tokenProvider: createTokenProvider(config) });
const sources = [];
for (const source of Object.values(config.sources).filter((item) => item.enabled)) {
  const [fields, records] = await Promise.all([
    client.listFields(source.appToken, source.tableId),
    client.listAllRecords(source.appToken, source.tableId, { pageSize: config.pageSize }),
  ]);
  sources.push({ key: source.key, label: source.label, fieldCount: fields.length, recordCount: records.length, readOnly: true });
}
process.stdout.write(`${JSON.stringify({ verifiedAt: new Date().toISOString(), mode: 'live-readonly', sources }, null, 2)}\n`);
