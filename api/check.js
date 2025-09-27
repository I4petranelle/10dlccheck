// api/check.js — wrapper for the extension, adds CORS + maps fields

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
  if (!message) return send(res, 400, { error: "Missing 'message'" });

  try {
    const base = `https://${req.headers.host}`;
    const r = await fetch(`${base}/api/check-compliance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const ct = r.headers.get('content-type') || '';
    let upstream = ct.includes('application/json') ? await r.json() : { ok:false, error:'Upstream not JSON', detail: await r.text() };

    if (!upstream.ok) {
      return send(res, 502, { status: 'fail', issues: [upstream.error || 'Upstream error'], tips: [] });
    }

    // Map: high => fail, some issues => warn, none => pass
    const hasHigh = upstream.issues?.some(i => i.severity === 'high');
    const status = hasHigh ? 'fail' : (upstream.issues?.length ? 'warn' : 'pass');

    const issues = (upstream.issues || []).map(i => i.message);
    const tips = upstream.suggestion ? [`Suggested rewrite: ${upstream.suggestion}`] : [];

    return send(res, 200, { status, issues, tips, score: upstream.score });
  } catch (e) {
    return send(res, 500, { status: 'fail', issues: ['Server error: ' + (e.message || e)], tips: [] });
  }
};
