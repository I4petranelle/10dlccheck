// ===============================
// app.js — 10DLC Check (Website)
// ===============================

// -------------------------------
// Local + Global counters & stats
// -------------------------------

var COUNT_KEY = 'tdlc_local_validation_count';
var GLOBAL_SEED_KEY = 'tdlc_global_seed_v1';
var GLOBAL_DAY_KEY = 'tdlc_global_day_v1';
var lastDurations = []; // for avg analysis time

function getLocalCount() {
  var n = Number(localStorage.getItem(COUNT_KEY));
  return isFinite(n) && n >= 0 ? n : 0;
}
function setLocalCount(n) { localStorage.setItem(COUNT_KEY, String(n)); }

function animateCount(el, start, end, ms) {
  var t0 = performance.now();
  function tick(now) {
    var p = Math.min(1, (now - t0) / ms);
    var val = Math.round(start + (end - start) * p);
    el.textContent = String(val);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initGlobalEstimateSeed() {
  var today = new Date().toISOString().slice(0,10);
  var seed = Number(localStorage.getItem(GLOBAL_SEED_KEY));
  var day  = localStorage.getItem(GLOBAL_DAY_KEY);

  if (!isFinite(seed)) {
    seed = 800 + Math.floor(Math.random() * 600);            // initial believable baseline
    localStorage.setItem(GLOBAL_SEED_KEY, String(seed));
    localStorage.setItem(GLOBAL_DAY_KEY, today);
    return seed;
  }
  if (day !== today) {
    seed += 50 + Math.floor(Math.random() * 30);              // gentle daily bump
    localStorage.setItem(GLOBAL_SEED_KEY, String(seed));
    localStorage.setItem(GLOBAL_DAY_KEY, today);
  }
  return seed;
}
function getGlobalEstimate() {
  return initGlobalEstimateSeed() + getLocalCount();
}

function renderStats() {
  // Local
  var lEl = document.getElementById('localCount');
  if (lEl) lEl.textContent = getLocalCount();

  // Global estimate (will be replaced by real value if API is configured)
  var gEl = document.getElementById('globalCount');
  if (gEl) gEl.textContent = getGlobalEstimate();

  // Avg time placeholder
  var aEl = document.getElementById('avgTime');
  if (aEl && !aEl.textContent) aEl.textContent = '—';
}

function setAvgTime(ms) {
  lastDurations.push(ms);
  if (lastDurations.length > 10) lastDurations.shift();
  var avg = Math.round(lastDurations.reduce(function(a,b){return a+b;},0) / lastDurations.length);
  var el = document.getElementById('avgTime');
  if (el) el.textContent = avg + ' ms';
}

// Try to fetch a real global count from /api/global-count (if env keys were set)
function tryFetchRealGlobal() {
  fetch('/api/global-count', { method: 'GET' })
    .then(function(res){ if (!res.ok) return null; return res.json(); })
    .then(function(data){
      if (!data || typeof data.total !== 'number') return;    // fall back to estimate silently
      var gEl = document.getElementById('globalCount');
      if (!gEl) return;
      var current = Number(gEl.textContent) || 0;
      animateCount(gEl, current, data.total, 500);
    })
    .catch(function(){ /* ignore if API not configured */ });
}

// Increment real global count (no-op if API not configured)
function postIncrementGlobal() {
  fetch('/api/global-count', { method: 'POST' })
    .then(function(res){ return res.ok ? res.json() : null; })
    .then(function(data){
      if (!data || typeof data.total !== 'number') return;
      var gEl = document.getElementById('globalCount');
      if (!gEl) return;
      var current = Number(gEl.textContent) || 0;
      animateCount(gEl, current, data.total, 500);
    })
    .catch(function(){ /* ignore if API not configured */ });
}

// -------------------------------
// Suggestions endpoint (Cloudflare Worker)
// -------------------------------
const SUGGEST_URL = "https://ai-suggest-10dlccheck.ipetranelle.workers.dev/"; // <-- your worker URL

function ensureSuggestionsContainer() {
  let box = document.getElementById("suggestions");
  if (!box) {
    const resultsDiv = document.getElementById("results");
    if (resultsDiv && resultsDiv.parentNode) {
      const h = document.createElement("h3");
      h.textContent = "Suggested Texts";
      h.className = "mt-3";
      box = document.createElement("div");
      box.id = "suggestions";
      box.className = "suggestions";
      resultsDiv.parentNode.insertBefore(h, resultsDiv.nextSibling);
      resultsDiv.parentNode.insertBefore(box, h.nextSibling);
    }
  }
  return box;
}

async function getSuggestions(userMessage) {
  try {
    console.log("[suggest] calling", SUGGEST_URL, userMessage);
    const res = await fetch(SUGGEST_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        brand: "10DLC Check",
        links: { tnc: "https://10dlccheck.com/terms.html" }
      })
    });
    const data = await res.json();
    console.log("[suggest] response", data);
    showSuggestions(data);
  } catch (err) {
    console.error("[suggest] error", err);
  }
}

function showSuggestions(data) {
  const box = ensureSuggestionsContainer();
  if (!box) return;
  const list = (data && data.suggestions) ? data.suggestions : [];
  box.innerHTML = list.map(function(s){
    return (
      '<div class="suggestion">' +
        '<p><strong>' + s.label + '</strong></p>' +
        '<textarea readonly>' + s.text + '</textarea>' +
        '<button onclick="navigator.clipboard.writeText(\'' + s.text.replace(/'/g,"\\'") + '\')">Copy</button>' +
      '</div>'
    );
  }).join("");
}

// -------------------------------
// Built-in fallback rules (minimal)
// Only used if /api/rules.js can't be fetched
// -------------------------------
var complianceRulesFallback = {
  version: "fallback",
  length: { softLimit: 160, concatLimit: 918 },
  characterLimit: {
    limit: 160, severity: "low",
    message: "Message exceeds 160 characters (may split into multiple SMS)",
    suggestion: "Shorten your message to under 160 characters to avoid splitting"
  },
  veryLongSms: {
    limit: 918, severity: "medium",
    message: "Message is very long for SMS concatenation (over ~918 characters).",
    suggestion: "Reduce length to avoid excessive concatenation and carrier filtering risk"
  },
  highRiskFinancial: {
    keywords: ["payday loan","cash advance","short-term loan","cryptocurrency","crypto","bitcoin","debt collection","stock alert","tax relief"],
    severity: "high",
    message: "Contains high-risk financial services content — may require special arrangements",
    suggestion: "Replace with general business funding language"
  },
  getRichQuick: {
    keywords: ["work from home","make money fast","secret shopper","easy money","multi-level marketing","mlm","gambling","sweepstakes","get rich","passive income","change your life","dreams come true","financial dreams"],
    severity: "high",
    message: "Contains get-rich-quick language — restricted on 10DLC",
    suggestion: "Focus on legitimate business services and professional growth"
  },
  thirdPartyServices: {
    keywords: ["debt consolidation","debt relief","debt reduction","debt forgiveness","credit repair","lead generation","job alert","broker"],
    severity: "high",
    message: "Contains third-party services content — restricted on 10DLC",
    suggestion: "Focus on direct services only"
  },
  controlledSubstances: {
    keywords: ["tobacco","vaping","vape","cannabis","cbd","marijuana","weed","illegal drug","prescription"],
    severity: "high",
    message: "Contains controlled-substances content — restricted on 10DLC",
    suggestion: "Remove all references to controlled substances"
  },
  shaft: {
    keywords: ["sex","adult","hate","alcohol","beer","wine","firearm","gun","weapon","tobacco","fuck","shit","damn","bitch"],
    severity: "high",
    message: "Contains SHAFT (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity) — restricted on 10DLC",
    suggestion: "Use professional, family-friendly language"
  },
  scams: {
    keywords: ["phishing","fraud","spam","deceptive","fake","scam","virus","malware","click here now","urgent action","verify account","suspended account","limited time offer"],
    severity: "high",
    message: "Contains potential scam/phishing content — prohibited on 10DLC",
    suggestion: "Use transparent, honest communication without urgency tactics"
  },
  charity: {
    keywords: ["donation","donate","charity","fundraising","contribute","help victims","disaster relief"],
    severity: "medium",
    message: "Charity/donation content — requires case-by-case approval",
    suggestion: "Be ready to provide proof of nonprofit status and messaging consent scope"
  },
  personalFinancialQuestions: {
    keywords: ["how much do you have outstanding","outstanding in total","current debt","existing loans","how much do you owe","financial situation","credit situation","debt situation"],
    severity: "high",
    message: "Requests detailed personal financial info — possible privacy violation",
    suggestion: "Avoid asking for detailed personal financials via SMS; use a secure portal"
  },
  personalInfo: {
    keywords: ["ssn","social security","credit card","password","pin number","bank account","routing number"],
    severity: "high",
    message: "Requests sensitive personal information — not allowed via SMS",
    suggestion: "Direct users to a secure portal for sensitive information"
  },
  aggressiveMarketing: {
    keywords: ["act now","limited time","free money","guaranteed","risk-free","no obligation","call now","urgent","expires today","once in lifetime","time to kickstart","kickstart your","dive in","make your dreams","dreams a reality","dont miss out","exclusive offer","special deal","amazing opportunity","incredible deal","unbelievable offer","life-changing","transform your life","financial breakthrough","breakthrough opportunity"],
    severity: "high",
    message: "Aggressive marketing language that carriers may flag",
    suggestion: "Use professional, consultative language instead of high-pressure tactics"
  },
  competitorMention: {
    keywords: ["headway","mulligan","credibly","on deck","ondeck","libertas","alliance funding group","cfg","peac solutions","kcg","byzfunder","good funding","channel partners","elevate","expansion","forward financing","fundation","kapitus"],
    severity: "low",
    message: "Mentions other lenders — may confuse recipients about sender",
    suggestion: "Keep brand references clear to avoid confusion or misleading comparisons"
  },
  consentDocumentation: {
    keywords: ["consent documentation","opt-in record","agreement record"],
    severity: "low",
    message: "Ensure consent documentation is maintained per CTIA",
    suggestion: "Maintain timestamped opt-in/HELP/STOP records in CRM"
  },
  consentScope: {
    keywords: ["different service","other products","share with partners","sell data","transfer consent"],
    severity: "medium",
    message: "Consent scope ambiguity — clarify what users opted into",
    suggestion: "State the specific program, message frequency, fees, HELP/STOP"
  },
  // store regex source as string; we'll compile it at load
  urlSecurity: {
    shortenerPattern: "(bit\\.ly|tinyurl\\.com|goo\\.gl|t\\.co|is\\.gd|ow\\.ly|rebrand\\.ly|cutt\\.ly)",
    severity: "medium",
    message: "Public link shortener detected — use branded HTTPS links",
    suggestion: "Prefer your own domain (e.g., links.yourbrand.com) with HTTPS"
  },
  advice: {
    linkTip: "Consider adding a helpful link (if relevant).",
    optOutTip: "Include STOP to opt out and HELP for assistance when opt-in is unknown.",
    optOutTipExcludeModes: ["pill"] // extension pill mode excludes STOP/HELP tip; web uses 'web'
  },
  aggressiveFinancialClaims: {
  keywords: ["guaranteed approval","instant approval","no credit check","pre-approved","risk-free","no obligation"],
  severity: "high",
  message: "Aggressive financial claims trigger filtering.",
  suggestion: "Avoid guarantees or unverifiable approval promises."
},
loginHarvesting: {
  keywords: ["log in","login","sign in","secure login","account verification","verify account","verify your account","needs verification","account suspended","avoid suspension","account locked"],
  severity: "high",
  message: "Login or credential collection language detected.",
  suggestion: "Avoid directing users to log in via SMS. Use neutral notifications instead."
},
missingBrandIdentification: {
  severity: "medium",
  message: "Brand identification missing at start of message.",
  suggestion: "Include your brand name at the beginning (e.g., “Acme: ...”)."
}
};

// -------------------------------
// Rules loading (external JSON with fallback)
// -------------------------------
var RULES = null;
var URL_SHORTENER_REGEX = null; // compiled at load

async function loadRules() {
  try {
    // Fetch from the new API endpoint first
    var res = await fetch('/api/public-rules', { cache: 'no-store' });
    if (!res.ok) throw new Error('API fetch failed');

    var data = await res.json();

    // Compile URL shortener regex if present
    if (data && data.urlSecurity && data.urlSecurity.shortenerPattern) {
      URL_SHORTENER_REGEX = new RegExp(data.urlSecurity.shortenerPattern, 'i');
    } else {
      URL_SHORTENER_REGEX = new RegExp(complianceRulesFallback.urlSecurity.shortenerPattern, 'i');
    }

    console.log('[rules] loaded from /api/public-rules');
    return data;

  } catch (e) {
    console.warn('⚠️ Using fallback rules. Reason:', e && e.message ? e.message : e);
    URL_SHORTENER_REGEX = new RegExp(complianceRulesFallback.urlSecurity.shortenerPattern, 'i');
    return complianceRulesFallback;
  }
}



// -------------------------------
// Utilities
// -------------------------------
function safeWordCount(text) {
  var t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
function hasHttpUrl(text) { return /https?:\/\//i.test(text); }

// -------------------------------
// Category metadata (name + impact labels shown in UI)
// -------------------------------
var CATEGORY_META = {
  // --- Public + fallback (shared) ---
  highRiskFinancial:{name:'High-Risk Financial Services',impact:'RESTRICTED – May require carrier pre-approval'},
  getRichQuick:{name:'Get-Rich-Quick / Prize Language',impact:'PROHIBITED – Likely campaign rejection'},
  thirdPartyServices:{name:'Third-Party Services',impact:'RESTRICTED – Must promote only direct/registered services'},
  controlledSubstances:{name:'Controlled Substances',impact:'PROHIBITED – Campaign will be rejected'},
  shaft:{name:'SHAFT Content',impact:'PROHIBITED – Sex, Hate, Alcohol, Firearms, Tobacco, or Profanity'},
  scams:{name:'Suspicious / Scam Content',impact:'PROHIBITED – Likely phishing or deceptive messaging'},
  aggressiveMarketing:{name:'Aggressive Marketing Language',impact:'HIGH RISK – Carriers actively filter pressure tactics'},
  consentScope:{name:'Consent Scope',impact:'MEDIUM RISK – Message may exceed original opt-in scope'},
  urlSecurity:{name:'URL Security / Shorteners',impact:'MEDIUM RISK – Prefer branded HTTPS links'},
  competitorMention:{name:'Competitor Mentions',impact:'LOW RISK – May cause brand confusion'},
  optOutDisclosureMissing:{name:'Missing STOP / HELP Disclosure',impact:'MEDIUM RISK – STOP and HELP disclosures are required'},

  // --- Public-only (but safe to keep even if fallback) ---
  aggressiveFinancialClaims:{name:'Aggressive Financial Claims',impact:'PROHIBITED – Approval/guarantee claims are filtered'},
  sensitivePersonalInfo:{name:'Sensitive Personal Information',impact:'PROHIBITED – Never request SSN, passwords, or bank data via SMS'},
  loginHarvesting:{name:'Login / Credential Harvesting',impact:'PROHIBITED – Login, verification, or suspension language detected'},
  missingBrandIdentification:{name:'Missing Brand Identification',impact:'MEDIUM RISK – Brand name should appear at message start'},

  // --- Fallback-only (legacy categories) ---
  charity:{name:'Charity / Donation Appeals',impact:'CASE-BY-CASE – May require additional approval'},
  personalFinancialQuestions:{name:'Personal Financial Questions',impact:'HIGH RISK – Privacy/security concerns'},
  consentDocumentation:{name:'Consent Documentation',impact:'LOW RISK – Maintain opt-in/HELP/STOP records'},

  // --- Aliases so fallback + public both work ---
  personalInfo:{name:'Sensitive Personal Information',impact:'PROHIBITED – Never request SSN, passwords, or bank data via SMS'}
};


// Build the category list dynamically from RULES keys present
function buildCategoryList(rules) {
  var keys = Object.keys(CATEGORY_META).filter(function(k){ return rules[k]; });
  return keys.map(function(k){
    return { key: k, name: CATEGORY_META[k].name, impact: CATEGORY_META[k].impact };
  });
}

// -------------------------------
// Compliance check (uses external RULES with fallback)
// -------------------------------
function performComplianceCheck(message) {
  var rules = RULES || complianceRulesFallback;
  var lower = message.toLowerCase();
  var issues = [];
  var detectedCategories = [];

  // Length checks
  if (rules.characterLimit && message.length > (rules.characterLimit.limit || 160)) {
    issues.push({
      severity: rules.characterLimit.severity || 'low',
      message: (rules.characterLimit.message || 'Message exceeds 160 characters') + ' (' + message.length + ' characters)',
      suggestion: rules.characterLimit.suggestion || 'Shorten your message to avoid splitting'
    });
  }
  if (rules.veryLongSms && message.length > (rules.length && rules.length.concatLimit ? rules.length.concatLimit : (rules.veryLongSms.limit || 918))) {
    issues.push({
      severity: rules.veryLongSms.severity || 'medium',
      message: rules.veryLongSms.message || 'Message is very long for SMS concatenation.',
      suggestion: rules.veryLongSms.suggestion || 'Reduce message length'
    });
  }

  // Keyword categories (dynamic)
  var categories = buildCategoryList(rules);
  categories.forEach(function(cat){
    var rule = rules[cat.key];
    var found = [];

    // keyword-based categories
    if (Array.isArray(rule.keywords)) {
      found = rule.keywords.filter(function(k){
        var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('\\b' + esc + '\\b', 'i').test(lower);
      });
    }

    // special urlSecurity regex
    if (cat.key === 'urlSecurity' && URL_SHORTENER_REGEX && URL_SHORTENER_REGEX.test(lower)) {
      found.push('public shortener');
    }

    if (found.length) {
      issues.push({
        severity: rule.severity || 'medium',
        message: (rule.message || cat.name) + (found[0] !== 'public shortener' ? ': "' + found.join('", "') + '"' : ''),
        suggestion: rule.suggestion || ''
      });
      detectedCategories.push({ name: cat.name, impact: cat.impact, keywords: found, severity: rule.severity || 'medium' });
    }
  });

  // Advice tips (non-blocking)
  var tips = [];
  var mode = 'web'; // website experience (extension uses 'pill' sometimes)
  if (rules.advice) {
    if (!hasHttpUrl(message) && rules.advice.linkTip) tips.push('🔗 ' + rules.advice.linkTip);
    var exclude = Array.isArray(rules.advice.optOutTipExcludeModes) ? rules.advice.optOutTipExcludeModes : [];
    if (rules.advice.optOutTip && exclude.indexOf(mode) === -1) {
      tips.push('📩 ' + rules.advice.optOutTip);
    }
  }

    // -------------------------------
  // Compliance scoring + status
  // -------------------------------
  var severityPoints = (RULES && RULES.scoring && RULES.scoring.severityPoints) || {
    low: 1,
    medium: 3,
    high: 5
  };

  var thresholds = (RULES && RULES.scoring && RULES.scoring.thresholds) || {
    pass: 0,
    warn: 3,
    fail: 5
  };

  var score = issues.reduce(function(sum, i){
    var sev = (i.severity || 'low').toLowerCase();
    return sum + (severityPoints[sev] || 0);
  }, 0);

  var status =
    score >= thresholds.fail ? 'fail' :
    score >= thresholds.warn ? 'warn' :
    'pass';

  return {
    isCompliant: status === 'pass', // backward compatible
    status: status,                 // NEW: pass | warn | fail
    score: score,                   // NEW: numeric score
    issues: issues,
    tips: tips,
    messageLength: message.length,
    wordCount: safeWordCount(message),
    restrictedContent: issues.filter(function(i){ return i.severity === 'high'; }).length,
    detectedCategories: detectedCategories
  };
}


// -------------------------------
// Results rendering — Variant A (flat, no buttons)
// -------------------------------
function escapeHTML(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function resultIcon(isCompliant){
  // Explicit size prevents oversized “checkbox” appearance if CSS is missing
  return isCompliant
    ? '<svg class="icon" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
    : '<svg class="icon" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
}
function resultIconByStatus(status){
  if (status === 'pass') return resultIcon(true);

  if (status === 'warn') {
    // yellow warning icon
    return '<svg class="icon" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor" viewBox="0 0 20 20">' +
           '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12.5a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5zM10 14.25a1 1 0 110 2 1 1 0 010-2z" clip-rule="evenodd"></path>' +
           '</svg>';
  }

  // fail
  return resultIcon(false);
}

function displayResults(analysis) {
  var resultsDiv = document.getElementById('results');
  var isCompliant = !!analysis.isCompliant;
  resultsDiv.className = 'results ' + statusClass;

  // quick counts
  var issues = Array.isArray(analysis.issues) ? analysis.issues : [];
  var high = issues.filter(function(i){ return i.severity === 'high'; }).length;
  var med  = issues.filter(function(i){ return i.severity === 'medium'; }).length;
  var low  = issues.filter(function(i){ return i.severity === 'low'; }).length;

  // detected categories
  var cats = analysis.detectedCategories || [];
  var catBadges = cats.map(function(c){
    var cls =
      c.impact.indexOf('PROHIBITED') > -1 ? 'bad-prohib' :
      c.impact.indexOf('RESTRICTED') > -1 ? 'bad-restrict' :
      c.impact.indexOf('HIGH RISK') > -1 ? 'bad-warn' : 'bad-info';
    return '<span class="badge ' + cls + '" title="' + escapeHTML(c.impact) + '">' + escapeHTML(c.name) + '</span>';
  }).join('');

  var catDetails = cats.map(function(c){
    var impactText = (c.impact.split(' - ')[1] || c.impact);
    return (
      '<div class="cat-item">' +
        '<div class="cat-head">' +
          '<div class="cat-name">' + escapeHTML(c.name) + '</div>' +
          '<div class="cat-impact">' + escapeHTML(impactText) + '</div>' +
        '</div>' +
        (c.keywords && c.keywords.length
          ? '<div class="cat-body"><strong>Keywords:</strong> "' + escapeHTML(c.keywords.join('", "')) + '"</div>'
          : ''
        ) +
      '</div>'
    );
  }).join('');

  var issueItems = issues.map(function(issue){
    var sev = escapeHTML(issue.severity || 'low');
    var msg = escapeHTML(issue.message || '');
    var sug = issue.suggestion ? '<div class="issue-sug">' + escapeHTML(issue.suggestion) + '</div>' : '';
    return (
      '<li class="issue ' + sev + '">' +
        '<div class="issue-msg">' + msg + '</div>' +
        sug +
      '</li>'
    );
  }).join('');

  var status = analysis.status || (isCompliant ? 'pass' : 'fail');

var title =
  status === 'pass' ? 'Message looks 10DLC compliant' :
  status === 'warn' ? 'Compliant, but risks detected' :
  'Not 10DLC compliant';

var statusClass =
  status === 'pass' ? 'compliant' :
  status === 'warn' ? 'warning' :
  'non-compliant';

var html =
  '<section class="res-card ' + statusClass + '">' +
    '<header class="res-header">' +
      '<div class="res-title">' +
        resultIconByStatus(status) +
        '<h3>' + title + '</h3>' +
      '</div>' +
      '<div class="res-metrics">' +
        '<div class="chip"><span class="chip-k">Chars</span><span class="chip-v">' + analysis.messageLength + '</span></div>' +
        '<div class="chip"><span class="chip-k">Words</span><span class="chip-v">' + analysis.wordCount + '</span></div>' +
        '<div class="chip"><span class="chip-k">Issues</span><span class="chip-v">' + (high+med+low) + '</span></div>' +
      '</div>' +
    '</header>';


  if (cats.length) {
  html +=
    '<section class="res-block">' +
      '<div class="okline" style="background:#fff8e6;border-color:#f59e0b;color:#92400e;">⚠️ Potential Compliance Risks Detected</div>' +
      '<div class="badge-row" style="margin-top:10px">' + catBadges + '</div>' +
      '<div class="cat-grid" style="margin-top:10px">' + catDetails + '</div>' +
    '</section>';
} else if (!issues.length) {
  html +=
    '<section class="res-block">' +
      '<div class="okline">✅ No compliance issues detected. Your message appears to follow 10DLC guidelines.</div>' +
    '</section>';
}


  if (analysis.tips && analysis.tips.length) {
    html +=
      '<section class="res-block">' +
        '<div class="block-title">Suggestions</div>' +
        '<ul class="tips">' + analysis.tips.map(function(t){ return '<li>' + escapeHTML(t) + '</li>'; }).join('') + '</ul>' +
      '</section>';
  }

  html += '</section>'; // res-card

  resultsDiv.innerHTML = html;
  resultsDiv.style.display = 'block';

  // If you still render any legacy toggle buttons somewhere else, this block won’t attach because elements don’t exist.
  var tIssues = document.getElementById('toggleIssuesBtn');
  var issuesList = document.getElementById('issuesList');
  if (tIssues && issuesList) {
    tIssues.addEventListener('click', function(){
      var open = issuesList.classList.contains('show');
      issuesList.classList.toggle('show', !open);
      tIssues.textContent = open ? 'Show Issues' : 'Hide Issues';
    });
  }
  var tImpact = document.getElementById('toggleImpactBtn');
  var impactDetails = document.getElementById('impactDetails');
  if (tImpact && impactDetails) {
    tImpact.addEventListener('click', function(){
      var open = impactDetails.classList.contains('show');
      impactDetails.classList.toggle('show', !open);
      tImpact.textContent = open ? 'Show Details' : 'Hide Details';
    });
  }
}

// -------------------------------
// Collapses helper (used by g1/g2 lists on page)
// -------------------------------
function toggleCollapse(headerEl, listEl) {
  var expanded = listEl.classList.contains('expanded');
  listEl.classList.toggle('expanded', !expanded);
  headerEl.classList.toggle('expanded', !expanded);
}

// -------------------------------
// Main wiring (no inline handlers)
// -------------------------------
document.addEventListener('DOMContentLoaded', async function(){
  // Load external rules (with fallback)
  RULES = await loadRules();
  console.log("[rules] version", RULES.version || "(fallback)");

  renderStats();          // show local + estimated global
  tryFetchRealGlobal();   // replace estimate with real total if API is configured

  var btn     = document.getElementById('checkBtn');
  var message = document.getElementById('message');
  var g1      = document.getElementById('g1');
  var g2      = document.getElementById('g2');
  var list1   = document.getElementById('compliance-list');
  var list2   = document.getElementById('restricted-list');

  if (g1 && list1) g1.addEventListener('click', function(){ toggleCollapse(g1, list1); });
  if (g2 && list2) g2.addEventListener('click', function(){ toggleCollapse(g2, list2); });

  if (btn) btn.addEventListener('click', analyzeMessage);
  if (message) {
    message.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        analyzeMessage();
      }
    });
  }
});


// app.js — global site script for 10dlccheck.com

(async function loadPartials() {
  // Load Topbar
  const topbar = document.getElementById('site-topbar');
  if (topbar) {
    try {
      const res = await fetch('/partials/topbar.html', { cache: 'no-store' });
      topbar.innerHTML = res.ok ? await res.text() : '<p>Navigation failed to load</p>';
      initTopbar();
    } catch (err) {
      console.error('Topbar load failed:', err);
    }
  }

  // Load Footer
  const footer = document.getElementById('site-footer');
  if (footer) {
    try {
      const res = await fetch('/partials/footer.html', { cache: 'no-store' });
      footer.innerHTML = res.ok ? await res.text() : '<p>Footer failed to load</p>';
    } catch (err) {
      console.error('Footer load failed:', err);
    }
  }
})();

// Initialize the topbar toggle (mobile nav)
function initTopbar() {
  const host = document.getElementById('site-topbar') || document;
  const btn = host.querySelector('#menuBtn');
  const nav = host.querySelector('#primaryNav');
  if (!btn || !nav) return;

  function toggle(open) {
    const isOpen = (open !== undefined) ? open : !nav.classList.contains('open');
    nav.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  btn.addEventListener('click', () => toggle());
  nav.addEventListener('click', e => { if (e.target.closest('a')) toggle(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });

  const mq = window.matchMedia('(max-width: 800px)');
  mq.addEventListener('change', e => { if (!e.matches) toggle(false); });
}
// Make sure the function runs after the page loads
if (document.readyState !== 'loading') {
  initTopbar();
} else {
  document.addEventListener('DOMContentLoaded', initTopbar, { once:true });
}



// -------------------------------
// Analyze -> render -> suggestions -> metrics
// -------------------------------
function analyzeMessage(){
  var messageText = (document.getElementById('message').value || '').trim();
  if (!messageText) {
    alert('Please enter a message to analyze.');
    return;
  }

  var loading = document.getElementById('loading');
  var results = document.getElementById('results');
  var btn     = document.getElementById('checkBtn');

  if (loading) loading.style.display = 'block';
  if (results) results.style.display = 'none';
  if (btn)     btn.disabled = true;

  var t0 = performance.now();

  setTimeout(function(){
    try {
      // compliance
      var analysis = performComplianceCheck(messageText);
      displayResults(analysis);

      // suggestions
      getSuggestions(messageText);

      // local counter
      var next = getLocalCount() + 1;
      setLocalCount(next);
      var lEl = document.getElementById('localCount');
      if (lEl) animateCount(lEl, Number(lEl.textContent) || 0, next, 400);

      // global: update estimate and try real POST increment
      var gEl = document.getElementById('globalCount');
      if (gEl) animateCount(gEl, Number(gEl.textContent) || 0, getGlobalEstimate(), 400);
      postIncrementGlobal();

      // avg duration
      var dur = Math.round(performance.now() - t0);
      setAvgTime(dur);
    } catch (err) {
      if (results) {
        results.innerHTML =
          '<div class="error-message"><strong>Analysis Failed:</strong> ' +
          (err && err.message ? err.message : 'Unable to check compliance right now.') +
          '</div>';
        results.style.display = 'block';
      }
    } finally {
      if (loading) loading.style.display = 'none';
      if (btn)     btn.disabled = false;
    }
  }, 900);
}
