// api/check.js — extension-facing wrapper
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

  // parse body
  let body = req.body;
  if (!body) {
    const raw = await new Promise(r => { let s=''; req.on('data', c=>s+=c); req.on('end', ()=>r(s)); });
    body = raw ? JSON.parse(raw) : {};
  }
  const message = (body.message || '').toString();
  if (!message) return send(res, 400, { status: 'fail', issues: ['Missing "message"'], tips: [] });

  try {
    const base = `https://${req.headers.host}`;
    // Call the site rules (now turnstile-free)
    const r = await fetch(`${base}/api/check-compliance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : null;

    if (!data || !data.ok) {
      return send(res, 502, { status: 'fail', issues: [data?.error || 'Upstream error'], tips: [] });
    }

    // Map from site shape -> extension shape
    const hasHigh = data.issues?.some(i => i.severity === 'high');
    const status  = hasHigh ? 'fail' : (data.issues?.length ? 'warn' : 'pass');
    const issues  = (data.issues || []).map(i => i.message);
    const tips    = (data.issues || []).map(i => i.suggestion).filter(Boolean);

    // Increment global counter (best-effort; ignore failure)
    try { await fetch(`${base}/api/global-count`, { method: 'POST' }); } catch {}

    return send(res, 200, { status, issues, tips });
  } catch (e) {
    return send(res, 500, { status: 'fail', issues: ['Server error: ' + (e.message || e)], tips: [] });
  }
};
