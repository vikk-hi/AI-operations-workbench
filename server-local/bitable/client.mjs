const API_ROOT = 'https://open.feishu.cn/open-apis/bitable/v1';
const AUTH_CODES = new Set([99991663, 99991668]);

export class BitableError extends Error {
  constructor(kind, code, status) {
    super(`Feishu Bitable request failed (${kind}, code ${code})`);
    this.name = 'BitableError';
    this.kind = kind;
    this.code = code;
    this.status = status;
  }
}

function errorKind(status, code) {
  if (status === 401 || AUTH_CODES.has(code)) return 'unauthorized';
  if (status === 403 || code === 99991672) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429 || code === 99991400) return 'rate_limited';
  return 'api_error';
}

export function createBitableClient({ tokenProvider, fetchImpl = fetch }) {
  const request = async (path, retried = false) => {
    const token = await tokenProvider.getToken();
    let response;
    try {
      response = await fetchImpl(`${API_ROOT}${path}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {
      throw new BitableError('network', 'NETWORK', 0);
    }
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') throw new BitableError('malformed_payload', 'MALFORMED', response.status);
    if (!response.ok || payload.code !== 0) {
      const code = payload.code ?? response.status;
      const kind = errorKind(response.status, code);
      if (kind === 'unauthorized' && !retried) {
        tokenProvider.invalidate();
        return request(path, true);
      }
      throw new BitableError(kind, code, response.status);
    }
    if (!payload.data || typeof payload.data !== 'object') throw new BitableError('malformed_payload', 'MISSING_DATA', response.status);
    return payload.data;
  };

  const listTables = async (appToken) => {
    const data = await request(`/apps/${encodeURIComponent(appToken)}/tables?page_size=100`);
    return Array.isArray(data.items) ? data.items : [];
  };

  const listFields = async (appToken, tableId) => {
    const data = await request(`/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields?page_size=100`);
    return Array.isArray(data.items) ? data.items : [];
  };

  const listAllRecords = async (appToken, tableId, options = {}) => {
    const pageSize = Math.min(500, Math.max(1, Number(options.pageSize || 500)));
    const records = [];
    let pageToken = '';
    do {
      const params = new URLSearchParams({ page_size: String(pageSize) });
      if (pageToken) params.set('page_token', pageToken);
      const data = await request(`/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records?${params}`);
      if (!Array.isArray(data.items)) throw new BitableError('malformed_payload', 'MISSING_ITEMS', 200);
      records.push(...data.items);
      pageToken = data.has_more ? String(data.page_token || '') : '';
      if (data.has_more && !pageToken) throw new BitableError('malformed_payload', 'MISSING_PAGE_TOKEN', 200);
    } while (pageToken);
    return records;
  };

  const listRecordIds = async (appToken, tableId, options = {}) => {
    const limit = Math.min(3, Math.max(1, Number(options.limit || 3)));
    const params = new URLSearchParams({ page_size: String(limit) });
    const data = await request(`/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records?${params}`);
    if (!Array.isArray(data.items)) throw new BitableError('malformed_payload', 'MISSING_ITEMS', 200);
    return data.items.slice(0, limit).map((record) => record.record_id).filter(Boolean);
  };

  return Object.freeze({ listTables, listFields, listAllRecords, listRecordIds });
}
