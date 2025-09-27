// api/check.js
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'POST')   return send(res, 405, { error: 'Use POST' });

  try {
    let body = req.body;
    if (!body) {
      const raw = await new Promise(resolve => {
        let s = ''; req.on('data', c => s += c); req.on('end', () => resolve(s));
      });
      body = raw ? JSON.parse(raw) : {};
    }
    const message = (body.message || '').toString();
    if (!message) return send(res, 400, { error: 'Missing "message"' });

    // Forward to your existing rules endpoint
    const base = `https://${req.headers.host}`; // works in preview & prod
    const r = await fetch(`${base}/api/check-compliance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    // Try JSON; if not JSON, fallback with an error payload
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const txt = await r.text();
      return send(res, 502, { error: 'Upstream not JSON', detail: txt.slice(0, 200) });
    }
    const data = await r.json();
    return send(res, 200, data);
  } catch (e) {
    return send(res, 500, { error: 'Server error', detail: String(e && e.message || e) });
  }
};
