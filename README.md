
# HM Operations Workbench

## 本地真实飞书登录

1. 在飞书开放平台的自建应用中添加回调地址 `http://127.0.0.1:3001/auth/callback`。
2. 复制 `.env.example` 为 `.env.local`，只在本机填写 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。
3. 运行 `npm run dev:local:web`，然后打开 `http://127.0.0.1:8080/client/index.html`。
4. 点击右上角“使用飞书登录”。授权成功后，页面显示飞书返回的真实姓名。

凭证和会话不写入 Git；本地登录服务只监听 `127.0.0.1`。这一步只接通身份，不会对多维表格执行写入。
