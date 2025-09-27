// ---- Local validation counter ----
const COUNT_KEY = 'tdlc_local_validation_count';
function getLocalCount() {
  var n = Number(localStorage.getItem(COUNT_KEY));
  return isFinite(n) && n >= 0 ? n : 0;
}
function setLocalCount(n) { localStorage.setItem(COUNT_KEY, String(n)); }
function renderLocalCount() {
  var el = document.getElementById('localCount');
  if (el) el.textContent = getLocalCount();
}

// ---- Rules ----
var complianceRules = {
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

// ---- Math verification ----
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

// ---- Helpers ----
function safeWordCount(text) {
  var t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function performComplianceCheck(message) {
  var lower = message.toLowerCase();
  var issues = [];
  var detectedCategories = [];

  if (message.length > complianceRules.characterLimit.limit) {
    issues.push({
      severity: complianceRules.characterLimit.severity,
      message: complianceRules.characterLimit.message + ' (' + message.length + ' characters)',
      suggestion: complianceRules.characterLimit.suggestion
    });
  }

  var categories = [
    {key:'highRiskFinancial', name:'High-Risk Financial Services', impact:'RESTRICTED - May require carrier pre-approval and enhanced monitoring'},
    {key:'getRichQuick', name:'Get Rich Quick Schemes', impact:'PROHIBITED - Campaign will be rejected'},
    {key:'thirdPartyServices', name:'Third-Party Services', impact:'RESTRICTED - Requires proof of direct relationship with customers'},
    {key:'controlledSubstances', name:'Controlled Substances', impact:'PROHIBITED - Campaign will be rejected'},
    {key:'shaft', name:'SHAFT Content', impact:'PROHIBITED - Campaign will be rejected'},
    {key:'scams', name:'Suspicious/Scam Content', impact:'PROHIBITED - Campaign will be rejected for suspicious content'},
    {key:'aggressiveMarketing', name:'Aggressive Marketing Language', impact:'HIGH RISK - Carriers actively filter this type of language'},
    {key:'personalInfo', name:'Personal Information Request', impact:'PROHIBITED - Violates privacy and security guidelines'}
  ];

  categories.forEach(function(cat){
    var rule = complianceRules[cat.key];
    var found = rule.keywords.filter(function(k){
      var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('\\b' + esc + '\\b', 'i').test(lower);
    });
    if (found.length) {
      issues.push({
        severity: rule.severity,
        message: rule.message + ': "' + found.join('", "') + '"',
        suggestion: rule.suggestion
      });
      detectedCategories.push({ name: cat.name, impact: cat.impact, keywords: found, severity: rule.severity });
    }
  });

  var highCount = issues.filter(function(i){ return i.severity === 'high'; }).length;
  return {
    isCompliant: highCount === 0,
    issues: issues,
    messageLength: message.length,
    wordCount: safeWordCount(message),
    restrictedContent: highCount,
    detectedCategories: detectedCategories
  };
}

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

// —— Collapses
function toggleCollapse(headerEl, listEl) {
  var expanded = listEl.classList.contains('expanded');
  listEl.classList.toggle('expanded', !expanded);
  headerEl.classList.toggle('expanded', !expanded);
}

// ---- Main wiring (no inline handlers) ----
document.addEventListener('DOMContentLoaded', function(){
  renderLocalCount();
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

  setTimeout(function(){
    try {
      var analysis = performComplianceCheck(messageText);
      displayResults(analysis);
      var next = getLocalCount() + 1;
      setLocalCount(next);
      renderLocalCount();
      generateMathQuestion();
      document.getElementById('mathAnswer').value = '';
    } catch (err) {
      results.innerHTML = '<div class="error-message"><strong>Analysis Failed:</strong> ' + (err && err.message ? err.message : 'Unable to check compliance right now.') + '</div>';
      results.style.display = 'block';
    } finally {
      loading.style.display = 'none';
      btn.disabled = false;
    }
  }, 900);
}
