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

function getLocalCount(){ var n = Number(localStorage.getItem(COUNT_KEY)); return isFinite(n)&&n>=0 ? n : 0; }
function setLocalCount(n){ localStorage.setItem(COUNT_KEY, String(n)); }

function animateCount(el, start, end, ms){
  var t0 = performance.now();
  function tick(now){
    var p = Math.min(1, (now - t0) / ms);
    var val = Math.round(start + (end - start) * p);
    el.textContent = String(val);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initGlobalEstimateSeed(){
  var today = new Date().toISOString().slice(0,10);
  var seed = Number(localStorage.getItem(GLOBAL_SEED_KEY));
  var day  = localStorage.getItem(GLOBAL_DAY_KEY);
  if (!isFinite(seed)){
    seed = 800 + Math.floor(Math.random()*600);
    localStorage.setItem(GLOBAL_SEED_KEY, String(seed));
    localStorage.setItem(GLOBAL_DAY_KEY, today);
    return seed;
  }
  if (day !== today){
    seed += 50 + Math.floor(Math.random()*30);
    localStorage.setItem(GLOBAL_SEED_KEY, String(seed));
    localStorage.setItem(GLOBAL_DAY_KEY, today);
  }
  return seed;
}
function getGlobalEstimate(){ return initGlobalEstimateSeed() + getLocalCount(); }

function renderStats(){
  var lEl = document.getElementById('localCount'); if (lEl) lEl.textContent = getLocalCount();
  var gEl = document.getElementById('globalCount'); if (gEl) gEl.textContent = getGlobalEstimate();
  var aEl = document.getElementById('avgTime'); if (aEl && !aEl.textContent) aEl.textContent = '—';
}

function setAvgTime(ms){
  lastDurations.push(ms); if (lastDurations.length > 10) lastDurations.shift();
  var avg = Math.round(lastDurations.reduce(function(a,b){return a+b;},0)/lastDurations.length);
  var el = document.getElementById('avgTime'); if (el) el.textContent = avg + ' ms';
}

function tryFetchRealGlobal(){
  fetch('/api/global-count', { method:'GET' })
    .then(function(res){ if(!res.ok) return null; return res.json(); })
    .then(function(data){
      if(!data || typeof data.total !== 'number') return;
      var gEl = document.getElementById('globalCount'); if(!gEl) return;
      var current = Number(gEl.textContent) || 0;
      animateCount(gEl, current, data.total, 400);
    })
    .catch(function(){ /* ignore */ });
}

function postIncrementGlobal(){
  // Use the existing global-count endpoint to increment the global counter.
  fetch('/api/global-count', { method:'POST' }).catch(function(){});
}

// -------------------------------
// Helpers used by analyzer
// -------------------------------
var URL_SHORTENER_REGEX = /\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|is\.gd|ow\.ly|rebrand\.ly|buff\.ly|bitly\.com)\b/i;

function hasHttpUrl(text){ return /\bhttps?:\/\/\S+/i.test(text); }
function safeWordCount(text){ var m = String(text||'').trim().match(/\S+/g); return m ? m.length : 0; }

// category metadata used to build category list
var CATEGORY_META = {
  highRiskFinancial: { name:'High-risk Financial', impact:'PROHIBITED' },
  getRichQuick:      { name:'Get Rich Quick',      impact:'PROHIBITED' },
  thirdPartyServices:{ name:'Third-party Services',impact:'PROHIBITED' },
  controlledSubstances:{ name:'Controlled Substances', impact:'PROHIBITED' },
  shaft:             { name:'SHAFT Content',       impact:'PROHIBITED' },
  scams:             { name:'Scams & Misleading',  impact:'PROHIBITED' },
  urlSecurity:       { name:'Public Link Shortener', impact:'RESTRICTED' },
  characterLimit:    { name:'Length > 160',        impact:'WARNING' },
  veryLongSms:       { name:'Very Long SMS',       impact:'WARNING' },
  personalInfo: { name: 'Sensitive Personal Info (PII)', impact: 'PROHIBITED' },
  aggressiveMarketing: { name: 'Aggressive Marketing', impact: 'RESTRICTED' }
};

function buildCategoryList(rules){
  if (!rules) return [];
  var keys = Object.keys(CATEGORY_META).filter(function(k){ return rules[k]; });
  return keys.map(function(k){
    return { key:k, name:CATEGORY_META[k].name, impact:CATEGORY_META[k].impact };
  });
}

// -------------------------------
// Load general rules from API (secure) with fallback
// -------------------------------
var RULES = null;

async function loadRules() {
  try {
    // Fetch rules securely from server endpoint
    const res = await fetch("/api/public-rules", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load /api/public-rules");

    const data = await res.json();
    console.log("[rules] Loaded version:", data.version || "unknown");
    RULES = data;
    return RULES;
  } catch (err) {
    console.warn("[rules] Using fallback rules due to:", err);
    RULES = complianceRulesFallback;
    return RULES;
  }
}


// -------------------------------
// Compliance check (rules-driven)
// -------------------------------
function performComplianceCheck(message){
  var rules = RULES || complianceRulesFallback;
  // normalize to improve matches (curly quotes, excess spaces)
  var lower = String(message||'')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  var issues = [];
  var detectedCategories = [];

  // Length checks
  if (rules.characterLimit && lower.length > (rules.characterLimit.limit || 160)){
    issues.push({
      severity: rules.characterLimit.severity || 'low',
      message: (rules.characterLimit.message || 'Message exceeds 160 characters') + ' (' + lower.length + ' characters)',
      suggestion: rules.characterLimit.suggestion || 'Shorten your message to avoid splitting'
    });
  }
  if (rules.veryLongSms && lower.length > (rules.length && rules.length.concatLimit ? rules.length.concatLimit : (rules.veryLongSms.limit || 918))){
    issues.push({
      severity: rules.veryLongSms.severity || 'medium',
      message: rules.veryLongSms.message || 'Message is very long for SMS concatenation.',
      suggestion: rules.veryLongSms.suggestion || 'Reduce message length'
    });
  }

  // Dynamic categories
  var categories = buildCategoryList(rules);
  categories.forEach(function(cat){
    var rule = rules[cat.key];
    var found = [];

    // keyword matches
    if (Array.isArray(rule.keywords)){
      found = rule.keywords.filter(function(k){
        var esc = String(k||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        return new RegExp('\\b'+esc+'\\b','i').test(lower);
      });
    }

    // URL shortener special-case
    if (cat.key === 'urlSecurity' && URL_SHORTENER_REGEX.test(lower)){ found.push('public shortener'); }

    if (found.length){
      issues.push({
        severity: rule.severity || 'medium',
        message: (rule.message || cat.name) + (found[0] !== 'public shortener' ? ': "' + found.join('", "') + '"' : ''),
        suggestion: rule.suggestion || ''
      });
      detectedCategories.push({ name:cat.name, impact:cat.impact, keywords:found, severity:rule.severity || 'medium' });
    }
  });

  // Advice tips (non-blocking)
  var tips = [];
  var mode = 'web';
  if (rules.advice){
    if (!hasHttpUrl(lower) && rules.advice.linkTip) tips.push('🔗 ' + rules.advice.linkTip);
    var exclude = Array.isArray(rules.advice.optOutTipExcludeModes) ? rules.advice.optOutTipExcludeModes : [];
    if (rules.advice.optOutTip && exclude.indexOf(mode) === -1){
      tips.push('📩 ' + rules.advice.optOutTip);
    }
  }

  var highCount = issues.filter(function(i){ return i.severity === 'high'; }).length;

  return {
    isCompliant: highCount === 0,
    issues: issues,
    tips: tips,
    messageLength: lower.length,
    wordCount: safeWordCount(lower),
    restrictedContent: highCount,
    detectedCategories: detectedCategories
  };
}

// -------------------------------
// Results renderer (clean, no duplication)
// -------------------------------
function displayResults(analysis){
  const root = document.getElementById('results');
  root.className = 'results-card';
  root.innerHTML = '';

  // derive quick stats from message text if needed (brand/link/opt-out)
  const messageText = document.getElementById('message').value || '';
  const chars = analysis.messageLength;
  const segments = Math.max(1, Math.ceil(chars / 160));
  const brandMatch = messageText.match(/\b([A-Z][a-zA-Z]+(?:Co|Company|Inc|LLC))\b/);
  const brandOk   = !!brandMatch;
  const optOutOk  = /(^|\s)(stop|unsubscribe)\b/i.test(messageText);
  const linkOk    = !URL_SHORTENER_REGEX.test(messageText);

  const status = analysis.isCompliant ? 'pass' : (analysis.issues && analysis.issues.length ? 'fail' : 'pass');
  const label  = analysis.isCompliant ? '✅ Compliant' : '❌ Compliance Issues Found';

  // header
  const top = document.createElement('div');
  top.className = 'res-top';
  top.innerHTML = `
    <span class="res-pill ${status}">${label}</span>
    <div class="res-meta">
      <span class="kpill"><strong>${chars||0}</strong> chars</span>
      <span class="kpill">~<strong>${segments}</strong> segment${segments>1?'s':''}</span>
      <span class="kpill">${brandOk ? 'Brand detected' : 'Brand missing'}</span>
      <span class="kpill">${optOutOk ? 'Opt-out present' : 'Opt-out missing'}</span>
      <span class="kpill">${linkOk ? 'Link OK' : 'Link risky'}</span>
    </div>
  `;

  const body = document.createElement('div');
  body.className = 'res-body';

  // categories -> badges
  const cats = Array.isArray(analysis.detectedCategories) ? analysis.detectedCategories : [];
  if (cats.length){
    const sec = document.createElement('section');
    sec.className = 'sec';
    sec.innerHTML = `<h4>Detected Categories</h4><div class="badges" id="catBadges"></div>`;
    const row = sec.querySelector('#catBadges');
    const seen = new Set();
    cats.forEach(function(c){
      const name = (c.name||'').trim(); if(!name || seen.has(name)) return;
      seen.add(name);
      const span = document.createElement('span');
      const lvl = (c.impact||'warning').toLowerCase().includes('prohibited') ? 'prohibited'
                : (c.impact||'').toLowerCase().includes('restricted') ? 'restricted'
                : 'warning';
      span.className = `badge ${lvl}`;
      span.textContent = name;
      row.appendChild(span);
    });
    body.appendChild(sec);
  }

  // unique issues
  const issues = Array.isArray(analysis.issues) ? analysis.issues : [];
  const unique = [];
  const seenTitles = new Set();
  issues.forEach(function(i){
    const key = (i.message || i.title || '').toLowerCase().trim();
    if(!key || seenTitles.has(key)) return;
    seenTitles.add(key);
    unique.push({
      severity: i.severity || 'low',
      title: i.message || i.title,
      tip: i.suggestion || i.tip || '',
      impact: i.impact || ''
    });
  });

  const secIssues = document.createElement('section');
  secIssues.className = 'sec';
  secIssues.innerHTML = `<h4>Issues</h4>`;

  if (unique.length){
    const counts = {
      high: unique.filter(i=>i.severity==='high').length,
      medium: unique.filter(i=>i.severity==='medium').length,
      low: unique.filter(i=>i.severity==='low').length
    };
    const hdr = document.createElement('div');
    hdr.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;';
    if (counts.high)  hdr.innerHTML += `<span class="kpill" style="background:#fff1f1;border-color:#ef4444;color:#991b1b">${counts.high} Critical</span>`;
    if (counts.medium)hdr.innerHTML += `<span class="kpill" style="background:#fff7e6;border-color:#f59e0b;color:#92400e">${counts.medium} Medium</span>`;
    if (counts.low)   hdr.innerHTML += `<span class="kpill" style="background:#eff6ff;border-color:#3b82f6;color:#1e40af">${counts.low} Minor</span>`;
    secIssues.appendChild(hdr);

    const ul = document.createElement('ul');
    ul.className = 'issue-list';
    unique.forEach(function(i){
      const li = document.createElement('li');
      li.className = `issue ${i.severity}`;
      li.innerHTML = `
        <div class="t">${i.title||''}</div>
        ${i.tip ? `<div class="s">${i.tip}</div>`:''}
        ${i.impact ? `<div class="i"><strong>Impact:</strong> ${i.impact}</div>`:''}
      `;
      ul.appendChild(li);
    });
    secIssues.appendChild(ul);
  } else {
    secIssues.innerHTML += `
      <div class="issue low" style="border-color:#10b981;background:#ecfdf5;">
        <div class="t" style="color:#065f46;">No issues detected 🎉</div>
        <div class="s">You can still review the suggestion below for a polished version.</div>
      </div>`;
  }
  body.appendChild(secIssues);


  // assemble
  root.appendChild(top);
  root.appendChild(body);
  root.classList.add('show');

  // buttons
  var ta = document.getElementById('bestSuggestion');
  var copyBtn = document.getElementById('copySuggestion');
  var useBtn  = document.getElementById('useSuggestion');
  var input   = document.getElementById('message');

  copyBtn && copyBtn.addEventListener('click', function(){
    navigator.clipboard.writeText(ta.value||'')
      .then(()=>{ copyBtn.textContent='Copied!'; setTimeout(()=>copyBtn.textContent='Copy',1200); })
      .catch(()=> alert('Copy failed — select and copy manually.'));
  });
  useBtn && useBtn.addEventListener('click', function(){
    if(!ta.value.trim() || !input) return;
    input.value = ta.value.trim();
    input.focus();
  });
}

// -------------------------------
// Fallback rules (used if /compliance/rules.js fails)
// -------------------------------
var complianceRulesFallback = {
  version: "fallback",
  length: { softLimit:160, concatLimit:918 },
  characterLimit: {
    limit:160, severity:"low",
    message:"Message exceeds 160 characters (may split into multiple SMS)",
    suggestion:"Shorten your message to under 160 characters to avoid splitting"
  },
  veryLongSms: {
    limit:918, severity:"medium",
    message:"Message is very long for SMS concatenation (over ~918 characters).",
    suggestion:"Reduce length to avoid excessive concatenation and carrier filtering risk"
  },
  highRiskFinancial: {
    keywords:["payday loan","cash advance","short-term loan","cryptocurrency","crypto","bitcoin","debt collection","stock alert","tax relief"],
    severity:"high",
    message:"Contains high-risk financial services content — may require special arrangements",
    suggestion:"Replace with general business funding language"
  },
  getRichQuick: {
    keywords:["work from home","make money fast","secret shopper","easy money","multi-level marketing","mlm","gambling","sweepstakes","get rich","passive income","change your life","dreams come true","financial dreams"],
    severity:"high",
    message:"Contains get-rich-quick language — restricted on 10DLC",
    suggestion:"Focus on legitimate business services and professional growth"
  },
  thirdPartyServices: {
    keywords:["debt consolidation","debt relief","debt reduction","debt forgiveness","credit repair","lead generation","job alert","broker"],
    severity:"high",
    message:"Contains third-party services content — restricted on 10DLC",
    suggestion:"Focus on direct services only"
  },
  controlledSubstances: {
    keywords:["tobacco","vaping","vape","cannabis","cbd","marijuana","weed","illegal drug","prescription"],
    severity:"high",
    message:"Contains controlled-substances content — restricted on 10DLC",
    suggestion:"Remove all references to controlled substances"
  },
  shaft: {
    keywords:["sex","adult","hate","alcohol","beer","wine","firearm","gun","weapon","tobacco","fuck","shit","damn","bitch"],
    severity:"high",
    message:"Contains SHAFT (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity) — restricted on 10DLC",
    suggestion:"Use professional, family-friendly language"
  },
  scams: {
    keywords:["phishing","fraud","spam","deceptive","fake","scam","virus","malware","click here now","urgent action","verify account","suspended account","limited time offer"],
    severity:"high",
    message:"Contains scams or misleading claims — restricted on 10DLC",
    suggestion:"Use clear, honest messaging; avoid manipulative urgency"
  },
  urlSecurity: {
    keywords:[], severity:"medium",
    message:"Public link shortener detected — risky for carrier filtering",
    suggestion:"Use a branded HTTPS link from your own domain"
  },
  advice: {
    linkTip: "Consider adding a help URL for context.",
    optOutTip: "Include opt-out language: “Reply STOP to opt out.”",
    optOutTipExcludeModes: []
  }
};

// -------------------------------
// Simple math verification
// -------------------------------
var mathAnswer = 0;
function generateMathQuestion(){
  var a = Math.floor(3 + Math.random()*7);
  var b = Math.floor(2 + Math.random()*6);
  mathAnswer = a + b;
  var qEl = document.getElementById('mathQuestion');
  if (qEl) qEl.textContent = a + ' + ' + b + ' =';
}

// -------------------------------
// Analyze -> render -> metrics
// -------------------------------
function analyzeMessage(){
  var messageText = (document.getElementById('message').value || '').trim();
  if (!messageText){ alert('Please enter a message to analyze.'); return; }

  // human check
  var raw = (document.getElementById('mathAnswer').value || '').trim();
  var userAnswer = Number(raw);
  if (!isFinite(userAnswer) || userAnswer !== mathAnswer){
    alert('Please solve the verification first.');
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
    try{
      // rules-driven analysis
      var analysis = performComplianceCheck(messageText);

      // Render consolidated results
      displayResults(analysis);

      // suggestions (Cloudflare Worker)
      getSuggestions(messageText);

      // local counter
      var next = getLocalCount() + 1;
      setLocalCount(next);
      var lEl = document.getElementById('localCount');
      if (lEl) animateCount(lEl, Number(lEl.textContent)||0, next, 400);

      // global: update estimate + try real POST increment
      var gEl = document.getElementById('globalCount');
      if (gEl) animateCount(gEl, Number(gEl.textContent)||0, getGlobalEstimate(), 400);
      postIncrementGlobal();

      // reset verification
      generateMathQuestion();
      document.getElementById('mathAnswer').value = '';

      // avg duration
      var dur = Math.round(performance.now() - t0);
      setAvgTime(dur);

      // show results
      results.style.display = 'block';
    }catch(err){
      results.innerHTML = '<div class="error-message"><strong>Analysis Failed:</strong> ' + (err && err.message ? err.message : 'Unable to check compliance right now.') + '</div>';
      results.style.display = 'block';
    }finally{
      loading.style.display = 'none';
      btn.disabled = false;
    }
  }, 300);
}

// -------------------------------
// Main wiring (no inline handlers)
// -------------------------------
document.addEventListener('DOMContentLoaded', function(){
  // Load rules then wire UI
  loadRules().then(function(r){ RULES = r; }).finally(function(){
    renderStats();
    tryFetchRealGlobal();
    generateMathQuestion();

    var btn = document.getElementById('checkBtn');
    var message = document.getElementById('message');
    var mathIn = document.getElementById('mathAnswer');

    if (btn) btn.addEventListener('click', analyzeMessage);
    if (message) message.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); analyzeMessage(); }
    });
    if (mathIn) mathIn.addEventListener('keydown', function(e){
      if (e.key === 'Enter'){ e.preventDefault(); analyzeMessage(); }
    });
  });
});

// === Cloudflare Worker connection ===
const SUGGEST_URL = "https://bold-disk-9289.ipetranelle.workers.dev/suggest";

async function getSuggestions(userMessage) {
  try {
    const ta = document.getElementById("bestSuggestion");
    if (ta && !ta.value.trim()) ta.value = "Waiting for suggestion…";

    const res = await fetch(SUGGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand: "[Brand]", message: userMessage })
    });

    const data = await res.json();
    showSuggestions(data);
  } catch (e) {
    console.error("[suggest] error", e);
    const ta = document.getElementById("bestSuggestion");
    if (ta) ta.value = "⚠️ Unable to generate suggestion at this time.";
  }
}

function showSuggestions(data) {
  const s = data && data.suggestions && data.suggestions[0];
  const ta = document.getElementById("bestSuggestion");
  if (!ta) return;
  if (s && s.text) {
    ta.value = s.text.trim();
    setTimeout(() => document.getElementById("aiSuggestionBox").style.border = "2px solid #58AEDD", 100);
  } else if (!ta.value.trim()) {
    ta.value = "⚠️ No suggestion returned.";
  }
}
