# V9 local baseline findings

## 1. Exact local parity achieved

Observed facts:

- The complete remote-tracking source at commit `2868edd848c83f30c11170c4ea12f9d9be1517a8` is preserved in an independent Git repository without upstream Git metadata or `.env`.
- The current V9 shell, navigation, five-theme selector, demo instructions, diagnosis path, product evidence drawer and read-only boundary labels run locally.
- The imported source contains the 2026-09-25 update set: company and brand targets, October/D11 timeline logic, real-owner normalization, current-login identity handling and refresh-verification language.
- Type checking passed; all 20 imported unit tests passed; the client and server production builds completed.
- The local client entry is `http://127.0.0.1:8080/client/index.html`.

## 2. Miaoda-only dependencies

Observed facts:

- `PlatformModule` eagerly initializes Miaoda HTTP, authentication and DataPaaS services. Without `FORCE_AUTHN_INNERAPI_DOMAIN` and platform credentials, the Nest server does not start.
- `DRIZZLE_DATABASE` supplies core metrics, tasks, targets and timeline data; `AuthNPaasService` resolves real user identities and task-owner names.
- The client bridge can render without those services. It emits the existing live-data error event, keeps the interface available and labels core/task data unavailable.
- `npm run dev:local` is platform-aware rather than an offline command: it performs environment pull, app sync and tool/skill sync. It is intentionally excluded from the credential-free baseline.

## 3. Data connections requiring local adapters

Recommendations:

1. Add a local repository adapter that implements the existing workbench response contracts from reviewed read-only snapshots under `sync/`.
2. Route identity and owner resolution through a local “unresolved/snapshot” adapter when Miaoda authentication is absent; never invent a real logged-in identity.
3. Keep data-source status explicit: snapshot date, refresh verification state and source table identity should travel with every response.
4. Add Feishu multi-dimensional-table reads as a separate, read-only connector after field mapping is approved. Keep writeback behind an independently reviewed adapter and explicit user action.
5. Preserve the current `axiosForBackend` boundary so the UI can switch between Miaoda, local snapshot and future read-only Feishu connectors without rewriting the V9 interface.

## 4. Recommended first UI/UX changes after baseline approval

Recommendations, in priority order:

1. Replace the full-page core/task failure states with a persistent mode banner plus usable snapshot cards, so local review can cover the entire V9 information architecture.
2. Reconcile status language across the app: use one vocabulary for “snapshot”, “last verified refresh” and “live connection”; remove remaining “continuous sync” wording where the connection is not verified.
3. Turn AI from a generic chat surface into a fixed workflow: select data scope → run analysis → show evidence-linked conclusion/anomaly/recommendation → optionally create a proposed writeback draft.
4. Add an evidence drawer for each AI conclusion that shows source table, rows/filters, metric formula, cutoff time and confidence/limitations.
5. Keep writeback disabled by default. A user should review the destination table, fields and exact proposed values before enabling a single explicit write action.

No online Miaoda change, publish, task creation, permission edit or Feishu write occurred during this baseline work.
