// api/check.js
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // --- Robust body parsing (Buffer | string | object) ---
    let body = req.body;
    if (Buffer.isBuffer(body)) body = body.toString('utf8');
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* raw text allowed */ } }

    // Accept {text} OR {message} OR raw string
    const textRaw = (typeof body === 'object' && body !== null)
      ? (body.text ?? body.message ?? '')
      : (body ?? '');
    const text = String(textRaw || '').trim();
    const mode = (typeof body === 'object' && body !== null && body.mode) ? String(body.mode) : 'unknown';

    if (!text) {
      // Return same shape your extension already handles (strings only)
      return res.status(200).json({ status: 'fail', issues: ['Missing input'], tips: [] });
    }

    // --- Lightweight evaluation (no internal rules leak) ---
    const issues = /** @type {string[]} */([]);
    const tips   = /** @type {string[]} */([]);

    // Length guidance
    if (text.length > 918) {
      issues.push(`Message is very long for SMS concatenation (${text.length} characters).`);
    } else if (text.length > 160) {
      issues.push(`Message exceeds ~160 characters (may split into multiple SMS) (${text.length} chars).`);
    }

    // Keyword flags (simple surface-level patterns)
    const lower = text.toLowerCase();
    const checks = [
      { msg:'Contains high-risk financial services content', words:['payday loan','cash advance','short-term loan','cryptocurrency','crypto','bitcoin','debt collection','stock alert','tax relief'] },
      { msg:'Contains get-rich-quick/MLM or gambling-adjacent content', words:['work from home','make money fast','secret shopper','easy money','multi-level marketing','mlm','gambling','sweepstakes','get rich','passive income'] },
      { msg:'Contains third-party services content', words:['debt consolidation','debt relief','debt reduction','debt forgiveness','credit repair','lead generation','job alert','broker'] },
      { msg:'References controlled substances', words:['tobacco','vaping','vape','cannabis','cbd','marijuana','weed','illegal drug','prescription'] },
      { msg:'Contains SHAFT content (Sex/Hate/Alcohol/Firearms/Tobacco/Profanity)', words:['sex','adult','hate','alcohol','beer','wine','firearm','gun','weapon','tobacco','fuck','shit','damn','bitch'] },
      { msg:'Contains potential scam/phishing patterns', words:['phishing','fraud','spam','deceptive','fake','scam','virus','malware','click here now','urgent action','verify account','suspended account'] },
      { msg:'Uses aggressive/over-promissory marketing language', words:['act now','limited time','free money','guaranteed','risk-free','no obligation','call now','urgent','expires today'] },
      { msg:'Requests sensitive personal information in SMS', words:['ssn','social security','credit card','password','pin number','bank account','routing number'] },
    ];

    let highFlag = false;
    checks.forEach(({ words, msg }) => {
      const found = words.filter(w => {
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${esc}\\b`, 'i').test(lower);
      });
      if (found.length) {
        highFlag = true;
        issues.push(`${msg}: "${found.join('", "')}"`);
      }
    });

    // Practical tips
    if (!/https?:\/\//i.test(text)) tips.push('Consider adding a helpful link (if relevant).');
    if (mode !== 'pill') tips.push('Include STOP to opt out and HELP for assistance when opt-in is unknown.');

    const status = highFlag ? 'fail' : (issues.length ? 'warn' : 'pass');

    // Optional counter (best-effort, never blocks)
	let totals = { incremented: false, total: null };
	try {
	 totals = await incrementGlobal('tdlc:checks_total');
	} catch {
	}
	return res.status(200).json({
	  status,
	  issues,
	  tips,
	  meta: { mode, length: text.length },
	  totals
	}); // keep extension unblocked
  }
}

// Optional Upstash Redis counter (safe no-op if envs missing)
async function incrementGlobal(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { incremented: false, total: null };

  // Try pipeline (INCR + GET)
  let r = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', key], ['GET', key]])
  });
  if (r.ok) {
    const data = await r.json().catch(() => null);
    const raw = Array.isArray(data) ? (data[1]?.result ?? data[0]?.result) : null;
    const total = Number(raw);
    if (Number.isFinite(total)) return { incremented: true, total };
  }

  // Fallback: single INCR
  r = await fetch(`${url}/INCR/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (r.ok) {
    const data = await r.json().catch(() => null);
    const total = Number(data?.result);
    if (Number.isFinite(total)) return { incremented: true, total };
  }

  return { incremented: false, total: null };
}
