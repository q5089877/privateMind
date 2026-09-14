const ALLOWED_ORIGINS = new Set([
  'https://q5089877.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const send = (res, status, body, origin) => {
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(status).json(body);
};

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (!ALLOWED_ORIGINS.has(origin)) return send(res, 403, { error: 'Forbidden: Unauthorized Origin' }, '');
  if (req.method === 'OPTIONS') return send(res, 204, null, origin);
  if (req.method !== 'POST') return send(res, 405, { error: 'Method Not Allowed' }, origin);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 500, { error: 'GEMINI_API_KEY is not configured.' }, origin);

  try {
    const request = req.body || {};
    const model = request.model || 'gemini-3.1-flash-lite';
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: request.contents,
        systemInstruction: request.systemInstruction,
        generationConfig: request.generationConfig,
      }),
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json');
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    return res.send(text);
  } catch (error) {
    return send(res, 502, { error: error instanceof Error ? error.message : 'Upstream request failed.' }, origin);
  }
}
