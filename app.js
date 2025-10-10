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
const SUGGEST_URL = "https://bold-disk-9289.ipetranelle.workers.dev/suggest"; // <-- your worker URL


async function getSuggestions(userMessage) {
  try {
    const res = await fetch(SUGGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand: "10DLC Check", message: userMessage })
    });
    const data = await res.json();
    showSuggestions(data);
  } catch (e) {
    console.error("[suggest] error", e);
  }
}


function showSuggestions(data) {
  const box = document.querySelector("#suggestions");
  if (!box) return;
  const s = data?.suggestions?.[0];
  if (!s) { box.innerHTML = ""; return; }
  box.innerHTML = `
    <div class="suggestion">
      <p><strong>${s.label || "Suggested message"}</strong></p>
      <textarea readonly>${s.text || ""}</textarea>
      <button onclick="navigator.clipboard.writeText(\`${(s.text||"").replace(/`/g,"\\`")}\`)">Copy</button>
    </div>
  `;
}

// -------------------------------
// Built-in fallback rules (minimal)
// Only used if /partials/rules.json can't be fetched
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
    keywords: ["headway","mulligan","credibly","on deck","ondeck","libertas","alliance funding group","cfg","peac solutions","kcg","byzfunder","good funding","channel partners","elevate","expansion","forward financing","fox","fundation","pearl","kapitus"],
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
    shortenerPattern: "(bit\\.ly|tinyurl\\.com|goo\\.gl|t\\.co|is\\.gd|ow\\.ly|rebrand\\.ly)",
    severity: "medium",
    message: "Public link shortener detected — use branded HTTPS links",
    suggestion: "Prefer your own domain (e.g., links.yourbrand.com) with HTTPS"
  },
  advice: {
    linkTip: "Consider adding a helpful link (if relevant).",
    optOutTip: "Include STOP to opt out and HELP for assistance when opt-in is unknown.",
    optOutTipExcludeModes: ["pill"] // extension pill mode excludes STOP/HELP tip; web uses 'web'
  }
};

// -------------------------------
// Rules loading (external JSON with fallback)
// -------------------------------
var RULES = null;
var URL_SHORTENER_REGEX = null; // compiled at load

async function loadRules() {
  try {
    var res = await fetch('/partials/rules.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    var data = await res.json();

    // compile url shortener regex if present
    if (data && data.urlSecurity && data.urlSecurity.shortenerPattern) {
      URL_SHORTENER_REGEX = new RegExp(data.urlSecurity.shortenerPattern, 'i');
    } else {
      URL_SHORTENER_REGEX = new RegExp(complianceRulesFallback.urlSecurity.shortenerPattern, 'i');
    }
    return data;
  } catch (e) {
    console.warn('⚠️ Using fallback rules. Reason:', e && e.message ? e.message : e);
    URL_SHORTENER_REGEX = new RegExp(complianceRulesFallback.urlSecurity.shortenerPattern, 'i');
    return complianceRulesFallback;
  }
}

// -------------------------------
// Math verification
// -------------------------------
var mathAnswer = 0;
function generateMathQuestion() {
  var ops = ['+','-','×'];
  var op = ops[Math.floor(Math.random()*ops.length)];
  var a = Math.floor(Math.random()*20)+1;
  var b = Math.floor(Math.random()*20)+1;
  var q = '', ans = 0;

  if (op === '+') { q = a + ' + ' + b; ans = a + b; }
  else if (op === '-') { var L = Math.max(a,b), S = Math.min(a,b); q = L + ' - ' + S; ans = L - S; }
  else { a = Math.floor(Math.random()*10)+1; b = Math.floor(Math.random()*10)+1; q = a + ' × ' + b; ans = a * b; }

  var mq = document.getElementById('mathQuestion');
  if (mq) mq.textContent = q + ' =';
  mathAnswer = ans;
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
  highRiskFinancial: { name: 'High-Risk Financial Services', impact: 'RESTRICTED - May require carrier pre-approval and enhanced monitoring' },
  getRichQuick: { name: 'Get Rich Quick Schemes', impact: 'PROHIBITED - Campaign will be rejected' },
  thirdPartyServices: { name: 'Third-Party Services', impact: 'RESTRICTED - Requires proof of direct relationship with customers' },
  controlledSubstances: { name: 'Controlled Substances', impact: 'PROHIBITED - Campaign will be rejected' },
  shaft: { name: 'SHAFT Content', impact: 'PROHIBITED - Campaign will be rejected' },
  scams: { name: 'Suspicious/Scam Content', impact: 'PROHIBITED - Campaign will be rejected for suspicious content' },
  aggressiveMarketing: { name: 'Aggressive Marketing Language', impact: 'HIGH RISK - Carriers actively filter this type of language' },
  personalInfo: { name: 'Personal Information Request', impact: 'PROHIBITED - Violates privacy and security guidelines' },
  charity: { name: 'Charity / Donation Appeals', impact: 'CASE-BY-CASE - May require additional approval' },
  personalFinancialQuestions: { name: 'Personal Financial Questions', impact: 'HIGH RISK - Privacy/security concerns' },
  competitorMention: { name: 'Competitor Mentions', impact: 'LOW RISK - Brand confusion / misleading claims' },
  consentDocumentation: { name: 'Consent Documentation', impact: 'REQUIRED - Maintain records per CTIA' },
  consentScope: { name: 'Consent Scope', impact: 'MEDIUM RISK - Clarify program scope' },
  urlSecurity: { name: 'URL Security / Shorteners', impact: 'MEDIUM RISK - Prefer branded HTTPS links' }
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

  var highCount = issues.filter(function(i){ return i.severity === 'high'; }).length;

  return {
    isCompliant: highCount === 0,
    issues: issues,
    tips: tips,
    messageLength: message.length,
    wordCount: safeWordCount(message),
    restrictedContent: highCount,
    detectedCategories: detectedCategories
  };
}

// -------------------------------
// Results rendering (also shows tips)
// -------------------------------
function displayResults(analysis) {
  var resultsDiv = document.getElementById('results');
  var isCompliant = analysis.isCompliant;
  resultsDiv.className = 'results ' + (isCompliant ? 'compliant' : 'non-compliant');

  var iconSvg = isCompliant
    ? '<svg class="icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
    : '<svg class="icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';

  var html = ''
    + '<h3>' + iconSvg + ' ' + (isCompliant ? 'Message is 10DLC Compliant!' : 'Compliance Issues Found') + '</h3>'
    + '<p><strong>Message Length:</strong> ' + analysis.messageLength + ' characters (' + analysis.wordCount + ' words)</p>';

  if (analysis.detectedCategories.length) {
    html += '<div class="category-warning">';
    html += '<h4>⚠️ Detected Issues — Campaign Impact Analysis</h4>';
    html += '<div class="category-summary">';
    analysis.detectedCategories.forEach(function(c){
      var impactClass = c.impact.indexOf('PROHIBITED')>-1 ? 'prohibited'
        : c.impact.indexOf('RESTRICTED')>-1 ? 'restricted'
        : c.impact.indexOf('HIGH RISK')>-1 ? 'warning' : 'branding';
      html += '<span class="category-badge ' + impactClass + '">' + c.name + '</span>';
    });
    html += '</div>';
    html += '<button class="toggle-details" id="toggleImpactBtn">Show Details</button>';
    html += '<div class="category-details" id="impactDetails">';
    analysis.detectedCategories.forEach(function(c){
      html += '<div class="category-item">'
        + '<div class="category-title">' + c.name + '</div>'
        + '<p><strong>Impact:</strong> ' + (c.impact.split(' - ')[1] || c.impact) + '</p>'
        + '<div class="category-keywords">Keywords found: "' + c.keywords.join('", "') + '"</div>'
        + '</div>';
    });
    html += '</div></div>';
  }

  if (analysis.issues.length) {
    var high = analysis.issues.filter(function(i){return i.severity==='high';}).length;
    var med  = analysis.issues.filter(function(i){return i.severity==='medium';}).length;
    var low  = analysis.issues.filter(function(i){return i.severity==='low';}).length;

    html += '<div class="issue-header"><div class="issue-summary">';
    if (high) html += '<span class="issue-count high">' + high + ' Critical</span>';
    if (med)  html += '<span class="issue-count medium">' + med + ' Medium</span>';
    if (low)  html += '<span class="issue-count low">' + low + ' Minor</span>';
    html += '</div><button class="toggle-issues" id="toggleIssuesBtn">Show Issues</button></div>';

    html += '<ul class="issue-list" id="issuesList">';
    analysis.issues.forEach(function(issue){
      html += '<li class="' + issue.severity + '">'
        + '<div class="issue-message">' + issue.message + '</div>'
        + (issue.suggestion ? '<div class="issue-suggestion">' + issue.suggestion + '</div>' : '')
        + '</li>';
    });
    html += '</ul>';
  } else if (!analysis.detectedCategories.length) {
    html += '<p>✅ No compliance issues detected! Your message appears to follow 10DLC guidelines.</p>';
  }

  // Tips (advice)
  if (analysis.tips && analysis.tips.length) {
    html += '<div class="advice"><h4>💡 Suggestions</h4><ul>';
    analysis.tips.forEach(function(t){ html += '<li>' + t + '</li>'; });
    html += '</ul></div>';
  }

  resultsDiv.innerHTML = html;
  resultsDiv.style.display = 'block';

  // attach toggles after render
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
// Collapses helper
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

  renderStats();          // show local + estimated global
  tryFetchRealGlobal();   // replace estimate with real total if API is configured
  generateMathQuestion();

  var btn = document.getElementById('checkBtn');
  var message = document.getElementById('message');
  var mathIn = document.getElementById('mathAnswer');
  var g1 = document.getElementById('g1');
  var g2 = document.getElementById('g2');
  var list1 = document.getElementById('compliance-list');
  var list2 = document.getElementById('restricted-list');

  if (g1 && list1) g1.addEventListener('click', function(){ toggleCollapse(g1, list1); });
  if (g2 && list2) g2.addEventListener('click', function(){ toggleCollapse(g2, list2); });

  if (btn) btn.addEventListener('click', analyzeMessage);
  if (message) message.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyzeMessage(); }
  });
  if (mathIn) mathIn.addEventListener('keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); analyzeMessage(); }
  });
});

// -------------------------------
// Analyze -> render -> suggestions -> metrics
// -------------------------------
function analyzeMessage(){
  var messageText = (document.getElementById('message').value || '').trim();
  if (!messageText) { alert('Please enter a message to analyze.'); return; }

  var raw = (document.getElementById('mathAnswer').value || '').trim();
  var userAnswer = Number(raw);
  if (!isFinite(userAnswer) || userAnswer !== mathAnswer) {
    alert('Please solve the math problem correctly to verify you\'re human.');
    generateMathQuestion();
    document.getElementById('mathAnswer').value = '';
    return;
  }

  var loading = document.getElementById('loading');
  var results = document.getElementById('results');
  var btn = document.getElementById('checkBtn');

  loading.style.display = 'block';
  results.style.display = 'none';
  btn.disabled = true;

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
      if (lEl) animateCount(lEl, Number(lEl.textContent)||0, next, 400);

      // global: update estimate and try real POST increment
      var gEl = document.getElementById('globalCount');
      if (gEl) animateCount(gEl, Number(gEl.textContent)||0, getGlobalEstimate(), 400);
      postIncrementGlobal();

      // reset verification
      generateMathQuestion();
      document.getElementById('mathAnswer').value = '';

      // avg duration
      var dur = Math.round(performance.now() - t0);
      setAvgTime(dur);
    } catch (err) {
      results.innerHTML = '<div class="error-message"><strong>Analysis Failed:</strong> ' + (err && err.message ? err.message : 'Unable to check compliance right now.') + '</div>';
      results.style.display = 'block';
    } finally {
      loading.style.display = 'none';
      btn.disabled = false;
    }
  }, 900);
}
