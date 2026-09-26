export async function readJsonBody(request, { maxBytes = 64 * 1024 } = {}) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > maxBytes) throw new Error('请求内容过大');
    chunks.push(bytes);
  }
  if (chunks.length === 0) return {};
  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('请求 JSON 格式无效');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请求内容必须是 JSON 对象');
  return value;
}
