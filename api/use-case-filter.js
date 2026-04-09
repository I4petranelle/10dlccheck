// ============================================================
// use-case-filter.js  — 10DLC Check use-case rule filtering
// Drop this <script> tag AFTER app.js on your page.
//
// What it does:
//  1. Injects a "Campaign Use Case" selector above the Check button
//  2. When a use case is selected, filters RULES to only the
//     applicable rule keys (from RULES.useCaseRules)
//  3. Shows contextual guidance for the selected use case
//  4. Auto-detects a likely use case from message content
//     (user can always override)
//  5. Passes the active use case to getSuggestions() so the
//     AI rewrite worker knows the compliance context
// ============================================================

(function UseCaseFilter() {

  // ── 1. Wait for DOM + RULES to be ready ──────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // RULES is loaded asynchronously in app.js — poll until ready
    var pollInterval = setInterval(function () {
      if (window.RULES && window.RULES.useCases) {
        clearInterval(pollInterval);
        init();
      }
    }, 100);
    // Fallback: if RULES never loads, still inject the selector
    setTimeout(function () { clearInterval(pollInterval); }, 5000);
  });

  // ── 2. Auto-detect heuristics ────────────────────────────
  var HEURISTICS = [
    { id: '2fa',                   patterns: /\b(otp|one.time.pass|verification code|auth code|2fa|two.factor)\b/i },
    { id: 'delivery_notification', patterns: /\b(your (order|package|shipment|delivery)|out for delivery|delivered|tracking|estimated arrival)\b/i },
    { id: 'fraud_alert',           patterns: /\b(unusual activity|suspicious (charge|transaction)|fraud alert|unauthorized)\b/i },
    { id: 'security_alert',        patterns: /\b(security (breach|alert|incident)|compromised|system (update|outage|maintenance))\b/i },
    { id: 'marketing',             patterns: /\b(sale|offer|promo|discount|% off|limited time|shop now|buy now|deal|coupon)\b/i },
    { id: 'customer_care',         patterns: /\b(support|help us improve|feedback|how did we do|ticket|case #|resolution)\b/i },
    { id: 'higher_education',      patterns: /\b(enrollment|tuition|campus|semester|financial aid|admissions|university|college)\b/i },
    { id: 'polling',               patterns: /\b(survey|poll|vote|rate your experience|how (would|do) you rate)\b/i },
    { id: 'psa',                   patterns: /\b(public health|awareness|community notice|emergency alert|evacuation|shelter)\b/i },
    { id: 'account_notification',  patterns: /\b(account (update|notice|activity|statement)|your (balance|subscription|plan))\b/i }
  ];

  function detectUseCase(message) {
    var lower = (message || '').toLowerCase();
    for (var i = 0; i < HEURISTICS.length; i++) {
      if (HEURISTICS[i].patterns.test(lower)) return HEURISTICS[i].id;
    }
    return null;
  }

  // ── 3. Build the selector HTML ───────────────────────────
  function buildSelectorHTML(useCases, selectedId) {
    var options = useCases.map(function (uc) {
      var sel = uc.id === selectedId ? ' selected' : '';
      return '<option value="' + uc.id + '"' + sel + '>' + uc.icon + ' ' + uc.label + '</option>';
    }).join('');

    return (
      '<div id="useCaseRow" style="margin-bottom:12px">' +
        '<label for="useCaseSelect" style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">' +
          '📋 Campaign Use Case' +
          '<span id="autoDetectBadge" style="display:none;margin-left:8px;font-size:11px;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:999px;font-weight:500">Auto-detected</span>' +
        '</label>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<select id="useCaseSelect" style="flex:1;min-width:200px;padding:9px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;background:#fff;color:#111827;cursor:pointer">' +
            '<option value="">— Select a use case —</option>' +
            options +
          '</select>' +
          '<button id="useCaseClearBtn" title="Clear selection" style="padding:9px 12px;border:1px solid #d1d5db;border-radius:10px;background:#fff;color:#6b7280;font-size:13px;cursor:pointer;white-space:nowrap">✕ Clear</button>' +
        '</div>' +
        '<div id="useCaseGuidance" style="display:none;margin-top:10px;padding:12px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;font-size:13px;color:#0c4a6e"></div>' +
      '</div>'
    );
  }

  // ── 4. Render guidance panel ─────────────────────────────
  function renderGuidance(useCaseId) {
    var panel = document.getElementById('useCaseGuidance');
    if (!panel) return;
    var guidance = window.RULES && window.RULES.useCaseGuidance && window.RULES.useCaseGuidance[useCaseId];
    if (!guidance) { panel.style.display = 'none'; return; }

    var notesHtml = guidance.notes.map(function (n) {
      return '<li style="margin-bottom:4px">' + n + '</li>';
    }).join('');

    panel.innerHTML =
      '<strong style="display:block;margin-bottom:6px">ℹ️ ' + guidance.headline + '</strong>' +
      '<ul style="margin:0;padding-left:18px;line-height:1.6">' + notesHtml + '</ul>';
    panel.style.display = 'block';
  }

  // ── 5. Apply rule filter for the active use case ─────────
  // Stores the original full RULES, then patches RULES with
  // a filtered evaluationOrder for the selected use case.
  var _originalEvaluationOrder = null;

  function applyUseCaseFilter(useCaseId) {
    if (!window.RULES) return;

    // Save the master evaluation order once
    if (!_originalEvaluationOrder) {
      _originalEvaluationOrder = window.RULES.evaluationOrder.slice();
    }

    if (!useCaseId || !window.RULES.useCaseRules || !window.RULES.useCaseRules[useCaseId]) {
      // No selection or unknown — restore full rule set
      window.RULES.evaluationOrder = _originalEvaluationOrder.slice();
      window.RULES._activeUseCase = null;
      return;
    }

    var allowed = window.RULES.useCaseRules[useCaseId];
    window.RULES.evaluationOrder = _originalEvaluationOrder.filter(function (key) {
      return allowed.indexOf(key) !== -1;
    });
    window.RULES._activeUseCase = useCaseId;

    console.log('[use-case-filter] active:', useCaseId, '→ rules:', window.RULES.evaluationOrder);
  }

  // ── 6. Wire up auto-detect on message input ──────────────
  var _lastAutoDetected = null;
  var _userOverrode = false;

  function tryAutoDetect() {
    var msg = document.getElementById('message');
    var sel = document.getElementById('useCaseSelect');
    var badge = document.getElementById('autoDetectBadge');
    if (!msg || !sel) return;

    // Don't overwrite if user has manually selected
    if (_userOverrode) return;

    var detected = detectUseCase(msg.value);
    if (detected && detected !== _lastAutoDetected) {
      _lastAutoDetected = detected;
      sel.value = detected;
      applyUseCaseFilter(detected);
      renderGuidance(detected);
      if (badge) badge.style.display = 'inline';
    } else if (!detected && _lastAutoDetected) {
      _lastAutoDetected = null;
      sel.value = '';
      applyUseCaseFilter(null);
      if (badge) badge.style.display = 'none';
      var panel = document.getElementById('useCaseGuidance');
      if (panel) panel.style.display = 'none';
    }
  }

  // ── 7. Main init ─────────────────────────────────────────
  function init() {
    var useCases = window.RULES.useCases;
    if (!useCases || !useCases.length) return;

    // Find insertion point: just above the Check button
    var checkBtn = document.getElementById('checkBtn');
    if (!checkBtn) return;
    var parent = checkBtn.parentNode;
    if (!parent) return;

    // Inject selector HTML
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildSelectorHTML(useCases, '');
    parent.insertBefore(wrapper.firstChild, checkBtn);

    // Change handler
    var sel = document.getElementById('useCaseSelect');
    if (sel) {
      sel.addEventListener('change', function () {
        _userOverrode = !!sel.value;
        var badge = document.getElementById('autoDetectBadge');
        if (badge) badge.style.display = _userOverrode ? 'none' : 'none';
        applyUseCaseFilter(sel.value);
        renderGuidance(sel.value);
      });
    }

    // Clear button
    var clearBtn = document.getElementById('useCaseClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (sel) sel.value = '';
        _userOverrode = false;
        _lastAutoDetected = null;
        applyUseCaseFilter(null);
        var panel = document.getElementById('useCaseGuidance');
        if (panel) panel.style.display = 'none';
        var badge = document.getElementById('autoDetectBadge');
        if (badge) badge.style.display = 'none';
      });
    }

    // Auto-detect on message input (debounced)
    var msg = document.getElementById('message');
    if (msg) {
      var debounce;
      msg.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(tryAutoDetect, 400);
      });
    }

    // Patch getSuggestions to include use-case context
    if (typeof window.getSuggestions === 'function') {
      var _origGetSuggestions = window.getSuggestions;
      window.getSuggestions = function (userMessage) {
        var sel = document.getElementById('useCaseSelect');
        var useCase = (sel && sel.value) || '';
        // Append use-case context to message for the AI worker
        var enrichedMessage = useCase
          ? '[Use Case: ' + useCase + '] ' + userMessage
          : userMessage;
        return _origGetSuggestions(enrichedMessage);
      };
    }

    console.log('[use-case-filter] initialized with', useCases.length, 'use cases');
  }

})();