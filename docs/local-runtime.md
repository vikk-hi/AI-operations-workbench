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

线上妙搭页面继续使用原有 `axiosForBackend`，本地连接不会修改线上行为。

## 权限边界

- 当前连接层只有 GET 请求和只读 Repository。
- 没有多维表格新增、修改、归档或删除方法。
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
