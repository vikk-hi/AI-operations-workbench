# Local V9 runtime

## 启动方式

安装锁定依赖后运行：

```bash
npm ci
npm run dev:local:web
```

打开 `http://127.0.0.1:8080/client/index.html`。本地身份与数据 API 监听 `127.0.0.1:3001`。

`.env.local` 只需保存在项目根目录，包含本机的 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。该文件被 Git 忽略。

## 数据来源

本地页面在 `localhost` 或 `127.0.0.1` 下使用本地 `/api/workbench/*`：

- 核心经营数据：2026 天猫日报
- 待办事项：工作日报任务
- 公司目标：QM 目标
- 活动时间线：大促 TIMELINE

线上妙搭页面继续使用原有 `axiosForBackend`；本次读写联动仅在本地运行时启用。

## 权限边界

- 核心经营数据和公司目标保持只读。
- 待办事项与活动时间线允许新增、修改和删除；所有写入必须先完成飞书登录。
- 服务端仅接受 `tasks` 和 `timeline` 两个白名单模块及其白名单字段，其他模块不能写入。
- 删除是多维表格永久删除，页面要求确认后再输入 `DELETE`，不会静默执行。
- 页面请求失败时显示模块错误，不回退成伪造的真实数据。
- App Secret、访问令牌和记录字段值不会写入探针报告。
- 聊天中曾出现过的 App Secret 应在本次联调完成后轮换。

## 验证

```bash
npm test
node --experimental-strip-types --test tests/*.test.ts
npm run type:check:client
npm run build:client
npm run verify:bitable
```

`verify:bitable` 会完整处理分页，但只输出每个来源的字段数和记录数，不输出记录内容。
