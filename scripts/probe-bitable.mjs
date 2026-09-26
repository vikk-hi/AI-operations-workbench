import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { createBitableClient } from '../server-local/bitable/client.mjs';
import { loadBitableConfig } from '../server-local/bitable/config.mjs';
import { createTokenProvider } from '../server-local/bitable/token-provider.mjs';

export async function buildProbeReport(config, client, generatedAt = new Date().toISOString()) {
  const baseTokens = [...new Set(Object.values(config.sources).map((item) => item.appToken).filter(Boolean))];
  const report = { generatedAt, bases: [], enabledSources: [] };
  for (const appToken of baseTokens) {
    try {
      const tables = await client.listTables(appToken);
      report.bases.push({ appToken, tables: tables.map((table) => ({ tableId: table.table_id, name: table.name })) });
    } catch (error) {
      report.bases.push({ appToken, error: { kind: error.kind || 'unknown', code: error.code || 'UNKNOWN' } });
    }
  }
  for (const source of Object.values(config.sources).filter((item) => item.enabled)) {
    try {
      const [fields, recordIds] = await Promise.all([
        client.listFields(source.appToken, source.tableId),
        client.listRecordIds(source.appToken, source.tableId, { limit: 3 }),
      ]);
      report.enabledSources.push({
        key: source.key,
        label: source.label,
        appToken: source.appToken,
        tableId: source.tableId,
        fields: fields.map((field) => ({ fieldId: field.field_id, name: field.field_name, type: field.type })),
        sampleRecordIds: recordIds,
      });
    } catch (error) {
      report.enabledSources.push({
        key: source.key,
        label: source.label,
        appToken: source.appToken,
        tableId: source.tableId,
        error: { kind: error.kind || 'unknown', code: error.code || 'UNKNOWN' },
      });
    }
  }
  return report;
}

async function main() {
  const envCandidates = [path.resolve('.env.local'), path.resolve('../..', '.env.local')];
  for (const candidate of envCandidates) {
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate, quiet: true });
      break;
    }
  }
  const config = loadBitableConfig();
  if (!config.publicStatus.configured) throw new Error(`Missing local configuration: ${config.publicStatus.missing.join(', ')}`);
  const client = createBitableClient({ tokenProvider: createTokenProvider(config) });
  process.stdout.write(`${JSON.stringify(await buildProbeReport(config, client), null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
