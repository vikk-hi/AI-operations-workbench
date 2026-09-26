const TOKEN_URL = 'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal';

export function createTokenProvider(config, fetchImpl = fetch) {
  let cached = null;

  return {
    invalidate() { cached = null; },
    async getToken() {
      if (cached && cached.refreshAt > Date.now()) return cached.value;
      let response;
      try {
        response = await fetchImpl(TOKEN_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
        });
      } catch {
        throw new Error('Feishu token request failed (network)');
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.code !== 0 || !payload.app_access_token) {
        const code = payload?.code ?? response.status;
        throw new Error(`Feishu token request failed (code ${code})`);
      }
      const expiresIn = Number(payload.expire || 7200);
      cached = {
        value: payload.app_access_token,
        refreshAt: Date.now() + Math.max(30, expiresIn - 300) * 1000,
      };
      return cached.value;
    },
  };
}
