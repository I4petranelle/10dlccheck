// api/check-compliance.js — CommonJS, mirrors on-site rules, no turnstile
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // CORS (safe to leave on for GET/POST from your extension or site)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST')    return json(res, 405, { ok: false, error: 'Method Not Allowed' });

  // Parse body defensively
  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      const raw = typeof body === 'string' ? body : await new Promise(r => {
        let s=''; req.on('data', c=>s+=c); req.on('end', ()=>r(s));
      });
      body = raw ? JSON.parse(raw) : {};
    } catch { body = {}; }
  }

  const message = (body.message || '').toString();
  if (!message) return json(res, 400, { ok: false, error: 'Missing input', need: ['message'] });

  const analysis = performComplianceCheck(message);
  return json(res, 200, { ok: true, ...analysis });
};

// ===== Helpers (ported from site) =====
function safeWordCount(text) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Rules copied from the site snippet
const complianceRules = {
  characterLimit: { limit: 160, severity: 'low',
    message: 'Message exceeds 160 characters (may split into multiple SMS)',
    suggestion: 'Shorten your message to under 160 characters to avoid splitting' },
  highRiskFinancial: { keywords: ['payday loan','cash advance','short-term loan','cryptocurrency','crypto','bitcoin','debt collection','stock alert','tax relief'],
    severity: 'high', message: 'Contains high-risk financial services content — may require special arrangements',
    suggestion: 'Replace with general business funding language' },
  getRichQuick: { keywords: ['work from home','make money fast','secret shopper','easy money','multi-level marketing','mlm','gambling','sweepstakes','get rich','passive income'],
    severity: 'high', message: 'Contains get-rich-quick scheme language — restricted on 10DLC',
    suggestion: 'Focus on legitimate business services and professional growth' },
  thirdPartyServices: { keywords: ['debt consolidation','debt relief','debt reduction','debt forgiveness','credit repair','lead generation','job alert','broker'],
    severity: 'high', message: 'Contains third-party services content — restricted on 10DLC',
    suggestion: 'Focus on direct services only' },
  controlledSubstances: { keywords: ['tobacco','vaping','vape','cannabis','cbd','marijuana','weed','illegal drug','prescription'],
    severity: 'high', message: 'Contains controlled substances content — restricted on 10DLC',
    suggestion: 'Remove all references to controlled substances' },
  shaft: { keywords: ['sex','adult','hate','alcohol','beer','wine','firearm','gun','weapon','tobacco','fuck','shit','damn','bitch'],
    severity: 'high', message: 'Contains SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity) — restricted on 10DLC',
    suggestion: 'Use professional, family-friendly language' },
  scams: { keywords: ['phishing','fraud','spam','deceptive','fake','scam','virus','malware','click here now','urgent action','verify account','suspended account'],
    severity: 'high', message: 'Contains potential scam/phishing content — strictly prohibited on 10DLC',
    suggestion: 'Use transparent, honest communication without urgency tactics' },
  aggressiveMarketing: { keywords: ['act now','limited time','free money','guaranteed','risk-free','no obligation','call now','urgent','expires today'],
    severity: 'high', message: 'Contains aggressive marketing language that carriers flag as suspicious',
    suggestion: 'Use professional, consultative language instead of high-pressure tactics' },
  personalInfo: { keywords: ['ssn','social security','credit card','password','pin number','bank account','routing number'],
    severity: 'high', message: 'Requesting sensitive personal information via SMS violates 10DLC guidelines',
    suggestion: 'Direct users to a secure portal for sensitive information' }
};

function performComplianceCheck(message) {
  const lower = message.toLowerCase();
  const issues = [];
  const detectedCategories = [];

  // length
  if (message.length > complianceRules.characterLimit.limit) {
    issues.push({
      severity: complianceRules.characterLimit.severity,
      message: `${complianceRules.characterLimit.message} (${message.length} characters)`,
      suggestion: complianceRules.characterLimit.suggestion
    });
  }

  // categories (as on site)
  const categories = [
    {key:'highRiskFinancial', name:'High-Risk Financial Services', impact:'RESTRICTED - May require carrier pre-approval and enhanced monitoring'},
    {key:'getRichQuick', name:'Get Rich Quick Schemes', impact:'PROHIBITED - Campaign will be rejected'},
    {key:'thirdPartyServices', name:'Third-Party Services', impact:'RESTRICTED - Requires proof of direct relationship with customers'},
    {key:'controlledSubstances', name:'Controlled Substances', impact:'PROHIBITED - Campaign will be rejected'},
    {key:'shaft', name:'SHAFT Content', impact:'PROHIBITED - Campaign will be rejected'},
    {key:'scams', name:'Suspicious/Scam Content', impact:'PROHIBITED - Campaign will be rejected for suspicious content'},
    {key:'aggressiveMarketing', name:'Aggressive Marketing Language', impact:'HIGH RISK - Carriers actively filter this type of language'},
    {key:'personalInfo', name:'Personal Information Request', impact:'PROHIBITED - Violates privacy and security guidelines'}
  ];

  categories.forEach(cat => {
    const rule = complianceRules[cat.key];
    const found = rule.keywords.filter(k => new RegExp(`\\b${esc(k)}\\b`, 'i').test(lower));
    if (found.length) {
      issues.push({
        severity: rule.severity,
        message: `${rule.message}: "${found.join('", "')}"`
        , suggestion: rule.suggestion
      });
      detectedCategories.push({ name: cat.name, impact: cat.impact, keywords: found, severity: rule.severity });
    }
  });

  const highCount = issues.filter(i => i.severity === 'high').length;
  return {
    isCompliant: highCount === 0,
    issues,
    messageLength: message.length,
    wordCount: safeWordCount(message),
    restrictedContent: highCount,
    detectedCategories
  };
}
