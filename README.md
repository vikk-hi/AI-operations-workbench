
# HM Operations Workbench

## 本地真实飞书登录与多维表格只读数据

1. 在飞书开放平台的自建应用中添加回调地址 `http://127.0.0.1:3001/auth/callback`。
2. 复制 `.env.example` 为 `.env.local`，只在本机填写 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。
3. 运行 `npm run dev:local:web`，然后打开 `http://127.0.0.1:8080/client/index.html`。
4. 点击右上角“使用飞书登录”。授权成功后，页面显示飞书返回的真实姓名，并从已授权的多维表格读取核心数据、待办、目标和时间线。

凭证和会话不写入 Git；本地服务只监听 `127.0.0.1`。当前连接严格只读，没有新增、修改或删除记录的接口。详细说明见 [`docs/local-runtime.md`](docs/local-runtime.md)。
