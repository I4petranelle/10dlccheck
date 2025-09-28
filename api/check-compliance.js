// api/check-compliance.js  — Vercel Serverless Function (Node.js, CommonJS)

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  // Parse body (Vercel usually parses JSON already, but be defensive)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { message, turnstile } = body || {};
  if (!message || !turnstile) {
    return res.status(400).json({ ok: false, error: 'Missing input', need: ['message', 'turnstile'] });
  }

  // --- 1) Verify Cloudflare Turnstile ---
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET || '',
        response: turnstile
      })
    });
    const verify = await resp.json();
    if (!verify.success) {
      return res.status(403).json({ ok: false, error: 'Human verification failed', meta: verify['error-codes'] });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Verification service unavailable' });
  }

  // --- 2) Compliance rules (keywords are examples; tune as you like) ---
  const rules = {
    characterLimit: {
      limit: 160,
      severity: 'low',
      message: 'Message exceeds 160 characters (may split into multiple SMS)'
    },
    highRiskFinancial: {
      keywords: ['payday loan','cash advance','short-term loan','cryptocurrency','crypto','bitcoin','debt collection','stock alert','tax relief'],
      severity: 'high',
      message: 'Contains high-risk financial services content — may require special arrangements'
    },
    getRichQuick: {
      keywords: ['work from home','make money fast','secret shopper','easy money','multi-level marketing','mlm','gambling','sweepstakes','get rich','passive income','change your life','dreams come true','financial dreams'],
      severity: 'high',
      message: 'Contains get-rich-quick language — restricted on 10DLC'
    },
    thirdPartyServices: {
      keywords: ['debt consolidation','debt relief','debt reduction','debt forgiveness','credit repair','lead generation','job alert','broker'],
      severity: 'high',
      message: 'Contains third-party services content — restricted on 10DLC'
    },
    controlledSubstances: {
      keywords: ['tobacco','vaping','vape','cannabis','cbd','marijuana','weed','illegal drug','prescription'],
      severity: 'high',
      message: 'Contains controlled-substances content — restricted on 10DLC'
    },
    shaft: {
      keywords: ['sex','adult','hate','alcohol','beer','wine','firearm','gun','weapon','tobacco','fuck','shit','damn','bitch'],
      severity: 'high',
      message: 'Contains SHAFT (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity) — restricted on 10DLC'
    },
    scams: {
      keywords: ['phishing','fraud','spam','deceptive','fake','scam','virus','malware','click here now','urgent action','verify account','suspended account','limited time offer'],
      severity: 'high',
      message: 'Contains potential scam/phishing content — prohibited on 10DLC'
    },
    charity: {
      keywords: ['donation','donate','charity','fundraising','contribute','help victims','disaster relief'],
      severity: 'medium',
      message: 'Charity/donation content — requires case-by-case approval'
    },
    personalFinancialQuestions: {
      keywords: ['how much do you have outstanding','outstanding in total','current debt','existing loans','how much do you owe','financial situation','credit situation','debt situation'],
      severity: 'high',
      message: 'Requests detailed personal financial info — possible privacy violation'
    },
    personalInfo: {
      keywords: ['ssn','social security','credit card','password','pin number','bank account','routing number'],
      severity: 'high',
      message: 'Requests sensitive personal information — not allowed via SMS'
    },
    aggressiveMarketing: {
      keywords: ['act now','limited time','free money','guaranteed','risk-free','no obligation','call now','urgent','expires today','once in lifetime','time to kickstart','kickstart your','dive in','make your dreams','dreams a reality','dont miss out','exclusive offer','special deal','amazing opportunity','incredible deal','unbelievable offer','life-changing','transform your life','financial breakthrough','breakthrough opportunity'],
      severity: 'high',
      message: 'Aggressive marketing language that carriers may flag'
    },
    competitorMention: {
      keywords: ['headway','mulligan','credibly','on deck','ondeck','libertas','alliance funding group','cfg','peac solutions','kcg','byzfunder','good funding','channel partners','elevate','expansion','forward financing','fox','fundation','pearl','kapitus'],
      severity: 'low',
      message: 'Mentions other lenders — may confuse recipients about sender'
    },
    consentDocumentation: {
      keywords: ['consent documentation','opt-in record','agreement record'],
      severity: 'low',
      message: 'Ensure consent documentation is maintained per CTIA'
    },
    consentScope: {
      keywords: ['different service','other products','share with partners','sell data','transfer consent'],
      severity: 'medium',
      message: 'Consent scope ambiguity — clarify what users opted into'
    },
    urlSecurity: {
      shortenerPattern: /(bit\.ly|tinyurl\.com|goo\.gl|t\.co|is\.gd|ow\.ly|rebrand\.ly)/i,
      severity: 'medium',
      message: 'Public link shortener detected — use branded HTTPS links'
    }
  };

  // --- 3) Analyze the message ---
  const issues = [];

  // length
  if (message.length > rules.characterLimit.limit) {
    issues.push({ rule: 'characterLimit', severity: rules.characterLimit.severity, message: rules.characterLimit.message });
  }

  // keyword-based categories
  const keywordRules = [
    'highRiskFinancial','getRichQuick','thirdPartyServices','controlledSubstances',
    'shaft','scams','charity','personalFinancialQuestions','personalInfo',
    'aggressiveMarketing','competitorMention','consentDocumentation','consentScope'
  ];
  for (const key of keywordRules) {
    const list = rules[key].keywords;
    if (list.some(word => new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').test(message))) {
      issues.push({ rule: key, severity: rules[key].severity, message: rules[key].message });
    }
  }

  // STOP/HELP presence
  const hasStop = /\bSTOP\b/i.test(message);
  const hasHelp = /\bHELP\b/i.test(message);
  if (!hasStop) issues.push({ rule: 'optOut', severity: 'high', message: 'Missing STOP opt-out (marketing/mixed campaigns)' });
  if (!hasHelp) issues.push({ rule: 'help', severity: 'medium', message: 'Missing HELP contact' });

  // URL checks
  const urls = message.match(/https?:\/\/\S+/gi) || [];
  if (urls.length) {
    if (urls.some(u => rules.urlSecurity.shortenerPattern.test(u))) {
      issues.push({ rule: 'urlSecurity', severity: rules.urlSecurity.severity, message: rules.urlSecurity.message });
    }
  }

  // --- 4) Build a suggested compliant rewrite ---
  let suggestion = message;

  // soften some marketing phrases (simple examples)
  const soften = [
    [/act now/gi,'get started'],
    [/limited time/gi,'limited-time'],
    [/guaranteed/gi,'designed to'],
    [/urgent/gi,'important'],
    [/click here now/gi,'learn more'],
  ];
  soften.forEach(([from,to]) => { suggestion = suggestion.replace(from, to); });

  // fix links: enforce https and replace public shorteners with branded URL
  suggestion = suggestion.replace(/https?:\/\/\S+/gi, (m) => {
    if (rules.urlSecurity.shortenerPattern.test(m)) return 'https://yourbrand.com/sms';
    return m.replace(/^http:\/\//i, 'https://');
  });

  // add HELP/STOP if missing
  if (!hasHelp) suggestion += (/[.!?]\s*$/.test(suggestion) ? '' : '.') + ' HELP: support@example.com';
  if (!hasStop) suggestion += ' Reply STOP to opt out.';

  // trim to ~160 chars without cutting words (optional)
  suggestion = trimToLength(suggestion, 160);

  // simple score
  const score = Math.max(0, 100 - issues.filter(i => i.severity === 'high').length * 20 - issues.filter(i => i.severity !== 'high').length * 10);

  return res.status(200).json({ ok: true, score, issues, suggestion });
};

// --- helpers ---
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function trimToLength(text, limit) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}
