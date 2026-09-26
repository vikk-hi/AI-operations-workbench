# V9 local baseline parity checklist

Verification date: 2026-09-26

Local URL: `http://127.0.0.1:8080/client/index.html`

Mode: credential-free, client-only, read-only

| Area | Status | Evidence |
| --- | --- | --- |
| Core data: primary metrics, period selector, trend, goal table, metric detail | Degraded | The core shell renders, but the page explicitly shows “数据连接暂不可用 / 无法读取妙搭数据库”; live cards and selectors are not fabricated from stale values. |
| Diagnosis: diagnosis path, product list, assortment, market comparison | Pass (demo) | Diagnosis path renders with category differences, UV/conversion/AOV decomposition, product rows, and tabs for product detail, assortment and market comparison; the page labels the content as a discussion demo. |
| Product interaction: filters, search, detail drawer, action form opens and cancels | Pass (demo) | Opened the product evidence drawer for `TM-DEMO-006`; inventory matrix, constraints and related tasks rendered, and the drawer closed without submitting an action. |
| Tasks: current/finished filters, search, task table, calendar/load/process navigation | Degraded | The task shell and list/calendar/load/process navigation render, but the page explicitly shows “任务数据暂不可用”; no live task table is claimed. |
| Data and rules: all registered data sources and read-only status | Degraded | The source table shell and replacement rule render; source rows remain in loading state because the Miaoda backend is absent. The page states that original tables are unchanged and self-service switching/writeback is unavailable. |
| Shared UI: theme selector, identity selector, notifications, demo instructions | Pass with identity degradation | Theme selector exposes five themes; demo instructions render; unauthenticated pages show “真实身份待确认 / 请通过飞书登录”. Diagnosis uses a clearly labeled demo identity selector. Notifications were not opened or marked read. |
| Safety: no create, update, publish, mark-read, permission, or Feishu write action | Pass | No form was submitted. The UI repeatedly states “正式写回尚未接通” and that demo actions do not write to real multi-dimensional tables. |

## Degraded platform-state checks

| Check | Result |
| --- | --- |
| Shell and primary navigation render without Miaoda environment values | Pass |
| Unavailable live data is labeled unavailable/loading rather than presented as current | Pass |
| No unhandled exception blocks the entire page | Pass |
| Fallback behavior does not enable real writeback | Pass |

This checklist validates the imported baseline, not production connectivity. Live Feishu reads and writes remain outside the approved local baseline scope.
