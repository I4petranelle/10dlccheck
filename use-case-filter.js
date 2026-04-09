// use-case-filter.js -- 10DLC Check
// Inserts the campaign use case selector once, directly above the action row.
// Guards against double-init so it is safe with defer or async loading.
//
// Use case list reflects TCR (The Campaign Registry) standard use cases only.
// Sources: TCR, AWS Pinpoint, Bandwidth, Twilio, CTIA Messaging Principles (May 2023)

(function UseCaseFilter() {

  // Guard: run only once
  if (window.__ucFilterInit) return;
  window.__ucFilterInit = true;

  // Styles
  var css =
    '#ucBlock{margin:0 0 14px;}' +
    '#ucBlock .uc-label{display:flex;align-items:center;gap:6px;font-size:.95rem;font-weight:700;color:#1C2D40;margin-bottom:6px;}' +
    '#ucBlock .uc-auto-tag{font-size:11px;font-weight:600;background:#e0f2fe;color:#0369a1;padding:2px 7px;border-radius:4px;margin-left:4px;display:none;}' +

    // Tooltip trigger
    '#ucBlock .uc-tip{position:relative;display:inline-flex;align-items:center;cursor:default;}' +
    '#ucBlock .uc-tip-icon{width:15px;height:15px;border-radius:50%;background:#94a3b8;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;line-height:1;flex-shrink:0;font-style:normal;}' +

    // Tooltip bubble
    '#ucBlock .uc-tip-bubble{display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);width:260px;padding:10px 12px;background:#1C2D40;color:#f1f5f9;font-size:.8rem;font-weight:400;line-height:1.5;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18);z-index:100;pointer-events:none;}' +
    '#ucBlock .uc-tip-bubble::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:#1C2D40;}' +
    '#ucBlock .uc-tip:hover .uc-tip-bubble,' +
    '#ucBlock .uc-tip:focus-within .uc-tip-bubble{display:block;}' +

    '#ucBlock .uc-row{display:flex;gap:8px;align-items:flex-start;}' +
    '#ucBlock .uc-sel-wrap{flex:1;min-width:0;}' +
    '#ucSelect{width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:.95rem;color:#1C2D40;background:#fff;cursor:pointer;font-family:inherit;}' +
    '#ucSelect:focus{outline:none;border-color:#58AEDD;box-shadow:0 0 0 3px rgba(88,174,221,.15);}' +
    '#ucClearBtn{padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;color:#94a3b8;font-size:.9rem;cursor:pointer;white-space:nowrap;font-family:inherit;}' +
    '#ucClearBtn:hover{color:#64748b;border-color:#cbd5e1;}' +
    '#ucGuidance{display:none;margin-top:8px;padding:10px 14px;background:#f0f9ff;border-left:3px solid #7dd3fc;border-radius:0 6px 6px 0;font-size:.88rem;color:#0369a1;line-height:1.6;}' +
    '#ucGuidance.show{display:block;}' +
    '#ucGuidance ul{margin:4px 0 0;padding-left:16px;}' +
    '#ucGuidance li{margin-bottom:2px;}';

  var styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // Use case definitions
  var USE_CASES = {
    '2fa': {
      label: '2FA / One-Time Passcode (OTP)',
      notes: [
        'Authentication, account verification, and one-time passcode messages only.',
        'No promotional content permitted.',
        'Opt-out (STOP) disclosure is not required for this use case.'
      ]
    },
    'account_notification': {
      label: 'Account Notifications',
      notes: [
        'Standard notifications about account status or activity for account holders.',
        'No promotional upsells in the same message.',
        'STOP/HELP is recommended.'
      ]
    },
    'customer_care': {
      label: 'Customer Care',
      notes: [
        'Support interactions, account management, and customer service conversations.',
        'Two-way conversational messaging is permitted under this use case.',
        'STOP/HELP is required.'
      ]
    },
    'delivery_notification': {
      label: 'Delivery Notifications',
      notes: [
        'Notifications about the status of a delivery of a product or service.',
        'No marketing content permitted in the same message.',
        'Opt-out disclosure is recommended.'
      ]
    },
    'fraud_alert': {
      label: 'Fraud Alert Messaging',
      notes: [
        'Notifications related to potential fraudulent activity on a customer\'s account.',
        'Phishing detection rules run at heightened sensitivity. Never request credentials via SMS.',
        'Include a verifiable callback number or branded URL.'
      ]
    },
    'higher_education': {
      label: 'Higher Education',
      notes: [
        'Messaging from colleges, universities, and other post-secondary education institutions.',
        'General CTIA rules apply. No get-rich-quick language permitted.',
        'STOP/HELP is required.'
      ]
    },
    'marketing': {
      label: 'Marketing',
      notes: [
        'Promotional content such as sales, discounts, and limited-time offers.',
        'All carrier rules apply. This is the most regulated standard use case.',
        'STOP/HELP are mandatory. Brand name is required at the start of each message.'
      ]
    },
    'mixed': {
      label: 'Mixed / Low Volume',
      notes: [
        'Covers multiple use cases in a single campaign, such as Customer Care and Delivery Notifications.',
        'Also used for small senders across any combination of use cases (typically under 15,000 messages per month).',
        'Evaluated under the strictest rule set applicable to the content types used.',
        'Expect lower throughput than dedicated use cases. STOP/HELP is required.'
      ]
    },
    'polling': {
      label: 'Polling and Voting (Non-Political)',
      notes: [
        'Customer surveys, feedback polls, and non-political voting actions only.',
        'NOT for political use.',
        'STOP/HELP is required.'
      ]
    },
    'psa': {
      label: 'Public Service Announcement (PSA)',
      notes: [
        'Informational messages to raise public awareness about a topic.',
        'No commercial promotion permitted.',
        'Identify the sponsoring organization clearly in each message.',
        'STOP/HELP is required.'
      ]
    },
    'security_alert': {
      label: 'Security Alert',
      notes: [
        'Notifications related to a compromised software or hardware system.',
        'Recipients must be prompted to take a specific action.',
        'No marketing content. Include a verifiable callback number or branded URL.'
      ]
    }
  };

  // Auto-detect heuristics
  var HEURISTICS = [
    { id: '2fa',                   re: /\b(otp|one.time|verification code|auth code|2fa|two.factor|passcode)\b/i },
    { id: 'delivery_notification', re: /\b(order|package|shipment|out for delivery|delivered|tracking|estimated arrival)\b/i },
    { id: 'fraud_alert',           re: /\b(unusual activity|suspicious (charge|transaction)|fraud alert|unauthorized)\b/i },
    { id: 'security_alert',        re: /\b(security (breach|alert|incident)|compromised|system (outage|maintenance))\b/i },
    { id: 'marketing',             re: /\b(sale|promo|discount|% off|limited time|shop now|buy now|coupon)\b/i },
    { id: 'customer_care',         re: /\b(support|feedback|how did we do|ticket|resolution)\b/i },
    { id: 'higher_education',      re: /\b(enrollment|tuition|campus|semester|financial aid|admissions|university|college)\b/i },
    { id: 'polling',               re: /\b(survey|poll|vote|rate your experience)\b/i },
    { id: 'psa',                   re: /\b(public health|awareness|community notice|emergency alert|evacuation)\b/i },
    { id: 'account_notification',  re: /\b(account (update|notice|activity|statement)|your (balance|subscription|plan))\b/i }
  ];

  function detectUseCase(text) {
    for (var i = 0; i < HEURISTICS.length; i++) {
      if (HEURISTICS[i].re.test(text)) return HEURISTICS[i].id;
    }
    return null;
  }

  // Build select options HTML
  function buildOptions() {
    var html = '<option value="">Select a use case (optional)</option>';
    Object.keys(USE_CASES).forEach(function(id) {
      html += '<option value="' + id + '">' + USE_CASES[id].label + '</option>';
    });
    return html;
  }

  // Build HTML
  function buildHTML() {
    return (
      '<div id="ucBlock">' +
        '<label class="uc-label">' +
          'What type of SMS campaign is this? <span style="font-weight:400;color:#94a3b8;font-size:.85rem;">(optional)</span>' +
          '<span class="uc-tip" tabindex="0" role="tooltip" aria-label="What is campaign use case?">' +
            '<i class="uc-tip-icon">?</i>' +
            '<span class="uc-tip-bubble">' +
              'This matches the use case you selected when registering your 10DLC campaign with The Campaign Registry (TCR) via your messaging provider (e.g., Twilio, Bandwidth, or Telnyx). ' +
              'Selecting the correct use case ensures your message is evaluated against the right carrier rules.' +
            '</span>' +
          '</span>' +
          '<span id="ucAutoTag" class="uc-auto-tag">auto-detected</span>' +
        '</label>' +
        '<div class="uc-row">' +
          '<div class="uc-sel-wrap">' +
            '<select id="ucSelect">' + buildOptions() + '</select>' +
            '<div id="ucGuidance"></div>' +
          '</div>' +
          '<button type="button" id="ucClearBtn">Clear</button>' +
        '</div>' +
      '</div>'
    );
  }

  // Render guidance panel
  function renderGuidance(id) {
    var panel = document.getElementById('ucGuidance');
    if (!panel) return;

    var uc = USE_CASES[id];
    if (!uc) {
      panel.className = '';
      panel.innerHTML = '';
      return;
    }

    panel.innerHTML = '<ul>' + uc.notes.map(function(n) { return '<li>' + n + '</li>'; }).join('') + '</ul>';
    panel.className = 'show';
  }

  // Rule filter
  var _originalOrder = null;

  function applyFilter(id) {
    if (!window.RULES) return;
    if (!_originalOrder) _originalOrder = window.RULES.evaluationOrder.slice();

    if (!id || !window.RULES.useCaseRules || !window.RULES.useCaseRules[id]) {
      window.RULES.evaluationOrder = _originalOrder.slice();
      window.RULES._activeUseCase = null;
      return;
    }
    var allowed = window.RULES.useCaseRules[id];
    window.RULES.evaluationOrder = _originalOrder.filter(function(k) {
      return allowed.indexOf(k) !== -1;
    });
    window.RULES._activeUseCase = id;
    console.log('[use-case-filter] active:', id);
  }

  // Main init
  var _lastAuto     = null;
  var _userOverrode = false;

  function init() {
    var checkBtn = document.getElementById('checkBtn');
    if (!checkBtn) return;
    var actionRow = checkBtn.closest('.action-row') || checkBtn.parentNode;
    if (!actionRow) return;

    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildHTML();
    actionRow.parentNode.insertBefore(wrapper.firstChild, actionRow);

    var sel     = document.getElementById('ucSelect');
    var autoTag = document.getElementById('ucAutoTag');
    var clear   = document.getElementById('ucClearBtn');
    var msg     = document.getElementById('message');

    if (sel) {
      sel.addEventListener('change', function() {
        _userOverrode = !!sel.value;
        if (autoTag) autoTag.style.display = 'none';
        applyFilter(sel.value);
        renderGuidance(sel.value);
      });
    }

    if (clear) {
      clear.addEventListener('click', function() {
        if (sel) sel.value = '';
        _userOverrode = false;
        _lastAuto = null;
        if (autoTag) autoTag.style.display = 'none';
        applyFilter(null);
        renderGuidance(null);
      });
    }

    if (msg) {
      var debounce;
      msg.addEventListener('input', function() {
        clearTimeout(debounce);
        debounce = setTimeout(function() {
          if (_userOverrode) return;
          var det = detectUseCase(msg.value);
          if (det && det !== _lastAuto) {
            _lastAuto = det;
            if (sel) sel.value = det;
            if (autoTag) autoTag.style.display = 'inline';
            applyFilter(det);
            renderGuidance(det);
          } else if (!det && _lastAuto) {
            _lastAuto = null;
            if (sel) sel.value = '';
            if (autoTag) autoTag.style.display = 'none';
            applyFilter(null);
            renderGuidance(null);
          }
        }, 400);
      });
    }

    if (typeof window.getSuggestions === 'function') {
      var _orig = window.getSuggestions;
      window.getSuggestions = function(userMessage) {
        var uc = (sel && sel.value) || '';
        return _orig(uc ? '[Use Case: ' + uc + '] ' + userMessage : userMessage);
      };
    }

    console.log('[use-case-filter] initialized');
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();