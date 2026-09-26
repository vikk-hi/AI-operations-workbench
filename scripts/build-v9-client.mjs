import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'client', 'v9-source');
const read = (name) => readFile(path.join(source, name), 'utf8');

export async function buildV9Html() {
  const [core, exporter, analytics, domain, seed, app, style, v8, v9, assetsText, configText, adapter] = await Promise.all([
    'core.js', 'export.js', 'analytics.js', 'v9-domain.js', 'seed.js', 'app.js', 'style.css', 'v8.css', 'v9.css', 'assets.json', 'config.json', 'live-adapter.js',
  ].map(read));
  const assets = JSON.parse(assetsText);
  const config = JSON.parse(configText);
  const marker = 'window.HMDemo={getState:';
  if (!app.includes(marker)) throw new Error('V9 integration marker missing');
  const integrated = app.replace(marker, `${adapter}\n${marker}`);
  const js = [core, exporter, analytics, domain,
    `const HMAssets=${JSON.stringify({ productTemplates: assets.productTemplates })};`,
    `const HMConfig=${JSON.stringify({ metrics: config.metrics, rules: config.rules })};`,
    seed, integrated].join('\n').replaceAll('</script', '<\\/script');
  const css = [style, v8, v9].join('\n').replaceAll('</style', '<\\/style');
  await writeFile(path.join(root, 'client', 'src', 'v9-runtime.js'), js, 'utf8');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>电商运营数据工作台 · V9</title><script>try{window.__platform__=JSON.parse('{{{__platform__}}}')}catch(e){window.__platform__={}}</script><style>${css}</style></head><body data-theme="mck"><aside id="sidebar" class="sidebar" aria-label="主导航"></aside><div class="shell"><header id="topbar" class="topbar"></header><main id="main" class="main">正在加载工作台…</main></div><div class="drawerback" id="drawerback"><section class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle"></section></div><div class="modalback" id="modalback"><section class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"></section></div><div id="toast" class="toast" role="status" aria-live="polite"></div><input type="file" id="backupFile" accept=".json,application/json" hidden><script type="module" src="/client/src/v9-bridge.ts"></script></body></html>`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(path.join(root, 'client', 'index.html'), await buildV9Html(), 'utf8');
}
