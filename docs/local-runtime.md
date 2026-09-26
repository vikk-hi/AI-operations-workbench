# Local V9 runtime

## Supported baseline command

Install the locked dependencies once:

```bash
npm ci
```

Start the credential-free, read-only client baseline:

```bash
npm run dev:client -- --host 127.0.0.1
```

Open `http://127.0.0.1:8080/client/index.html` and verify it with:

```bash
bash scripts/verify-local-runtime.sh
```

This command intentionally starts only the imported client. It does not run `env pull`, Miaoda app sync, a Feishu write, or a release operation.

## Existing project commands

| Purpose | Existing command | Baseline result |
| --- | --- | --- |
| Type check | `npm run type:check` | Passed for client and server |
| Unit tests | `node --test tests/*.test.ts` | 20 passed, 0 failed; Node emitted module-type performance warnings |
| Build | `npm run build` | Passed; route-generator downloads were blocked in the sandbox but the script treats them as optional and both client/server builds completed |
| Client development | `npm run dev:client` | Passed at port 8080 |
| Server development | `npm run dev:server` | Platform-only without Miaoda environment; see below |
| Combined platform-aware local mode | `npm run dev:local` | Not used for this baseline because it performs env pull and tool/app synchronization before starting |
| Lint | `npm run lint` | Available but not required by the baseline plan |

The locked install did not modify `package-lock.json`.

## Platform-only dependencies and local boundaries

| Dependency | Used by | Behavior without Miaoda | Local boundary |
| --- | --- | --- | --- |
| `PlatformModule` and platform HTTP client | Nest application bootstrap | Backend exits because `FORCE_AUTHN_INNERAPI_DOMAIN` is absent | Do not start the platform backend in credential-free baseline mode; add a separate local data adapter in the next implementation phase |
| `DRIZZLE_DATABASE` / DataPaaS | Workbench overview, task, target and timeline APIs | No local database provider exists | Use checked-in read-only snapshots through a local repository adapter; never fake a live sync state |
| `AuthNPaasService` | Current user and task-owner name resolution | Real identity lookup is unavailable | Display snapshot/unresolved identities and label them as local/read-only |
| `axiosForBackend` | Client V9 bridge API requests | Requests fail when the platform backend is absent; the bridge emits `hm-live-error` | Existing V9 demo/snapshot runtime remains the degraded UI; a future adapter should provide the same response contracts locally |
| `showConfirm` | V9 confirmation dialogs | Available from the installed client toolkit; no Feishu write is connected | Keep confirmations local and disable submit/write actions until a reviewed write adapter exists |
| Miaoda `env pull`, app sync and skills sync | `scripts/dev-local.js` / `scripts/dev.sh` | Would fetch platform environment and mutate local tooling | Excluded from the credential-free baseline command |

## Current baseline meaning

The local client proves that the complete V9 interface and its checked-in snapshot/demo state can run independently. Live multi-dimensional-table reads, real login identity and task-owner resolution still depend on Miaoda services. They are not claimed as locally live, and no writeback is enabled.
