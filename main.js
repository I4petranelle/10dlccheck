console.log("main.js loaded");


const AI_API = "https://ai-suggest-10dlccheck.ipetranelle.workers.dev/suggest";

  // =========================
  // Email Gate + AI suggest
  // =========================
  (function aiEmailGate() {
    const SESSION_KEY = "userEmail10DLC_session";
    const LOCAL_KEY   = "userEmail10DLC";

    const checkBtn     = document.getElementById("checkBtn");
    const msgEl        = document.getElementById("message");
    const aiOptIn      = document.getElementById("aiOptIn");
    const aiFixCta     = document.getElementById("aiFixCta");
    const aiFixBtn     = document.getElementById("aiFixBtn");
    const aiLeadPanel  = document.getElementById("aiLeadPanel");
    const leadForm     = document.getElementById("signupForm");
    const leadEmailEl  = document.getElementById("leadEmail");
    const aiPanel      = document.getElementById("aiPanel");
    const aiText       = document.getElementById("aiSuggestionText");
    const aiFlags      = document.getElementById("aiSuggestionFlags");
    const results      = document.getElementById("results");

   // Track email intent (focus)
if (leadEmailEl) {
  leadEmailEl.addEventListener("focus", () => {
    if (typeof track === "function") track("email_focus");
  });
}

    // --- helpers ---
    function resetAiSuggestionBox() {
      if (aiText)  aiText.textContent  = "Suggestion will appear here.";
      if (aiFlags) aiFlags.textContent = "";
    }

    function hideAiCompletely() {
      if (aiLeadPanel) aiLeadPanel.style.display = "none";
      if (aiPanel)     aiPanel.style.display     = "none";
      if (aiFixCta)    aiFixCta.style.display    = "none";
      resetAiSuggestionBox();
    }

    // Prefill email if saved
    const savedEmail = localStorage.getItem(LOCAL_KEY);
    if (savedEmail && leadEmailEl) leadEmailEl.value = savedEmail;

    // Optional CTA button
    if (aiFixBtn) {
      aiFixBtn.addEventListener("click", () => {
        if (aiLeadPanel) aiLeadPanel.style.display = "block";
        if (aiFixCta)    aiFixCta.style.display    = "none";
        leadEmailEl?.focus();
      });
    }

    // Gate when results render
    if (results) {
      const onResultsRender = () => {
        const hasContent = (results.textContent || results.innerHTML || "").trim().length > 0;
        if (!hasContent) return;

        // If AI is turned off, hide everything and stop
        if (aiOptIn && !aiOptIn.checked) {
          hideAiCompletely();
          return;
        }

        const sessionEmail = sessionStorage.getItem(SESSION_KEY);

        if (sessionEmail) {
          // Email already captured → show AI panel
          if (aiLeadPanel) aiLeadPanel.style.display = "none";
          if (aiPanel)     aiPanel.style.display     = "block";
          if (aiText || aiFlags) renderAiSuggestion();
        } else {
          // No email yet → show gate, hide AI suggestion
          if (aiLeadPanel) aiLeadPanel.style.display = "block";
          if (aiPanel)     aiPanel.style.display     = "none";
          if (aiFixCta)    aiFixCta.style.display    = "none";
          if (aiText)      aiText.textContent        = "Suggestion will appear after you enter your email.";
          if (aiFlags)     aiFlags.textContent       = "";
        }
      };

      onResultsRender();
      new MutationObserver(onResultsRender).observe(results, {
        childList: true,
        subtree: true
      });
    }

    // React immediately when the user toggles the AI checkbox
    if (aiOptIn) {
      aiOptIn.addEventListener("change", () => {
        if (!aiOptIn.checked) {
          hideAiCompletely();
          return;
        }

        const sessionEmail = sessionStorage.getItem(SESSION_KEY);

        if (sessionEmail) {
          if (aiLeadPanel) aiLeadPanel.style.display = "none";
          if (aiPanel)     aiPanel.style.display     = "block";
          if (aiText || aiFlags) renderAiSuggestion();
        } else {
          if (aiLeadPanel) aiLeadPanel.style.display = "block";
          if (aiPanel)     aiPanel.style.display     = "none";
          if (aiFixCta)    aiFixCta.style.display    = "none";
          if (aiText)      aiText.textContent        = "Suggestion will appear after you enter your email.";
          if (aiFlags)     aiFlags.textContent       = "";
        }
      });
    }

    // Handle email submit
    window.handleLeadSubmit = async function (e) {
  if (e?.preventDefault) e.preventDefault();

  // Track submit attempt
  if (typeof track === "function") track("email_submit");

  const email = (leadEmailEl?.value || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    leadEmailEl?.setCustomValidity("Enter a valid email address");
    leadEmailEl?.reportValidity();
    return false;
  }
  leadEmailEl?.setCustomValidity("");

  try {
    sessionStorage.setItem(SESSION_KEY, email);
    localStorage.setItem(LOCAL_KEY, email);
  } catch {}

  // Post to FormSubmit without navigating
  try {
    if (leadForm) {
      const fd = new FormData(leadForm);
      fd.append("form_name", "AI Fix Lead");
      fd.append("site", location.hostname);
      fd.append("page", location.pathname + location.search);

      const endpoint = leadForm.getAttribute("data-endpoint") || leadForm.action;
      if (endpoint) {
        const resp = await fetch(endpoint, { method: "POST", body: fd, mode: "cors" });
        if (!resp.ok) console.warn("[lead] FormSubmit non-OK:", resp.status);
      }
    }
  } catch (err) {
    console.warn("[lead] FormSubmit error:", err);
  }

  // Close lead gate, show AI panel
  if (aiLeadPanel) aiLeadPanel.style.display = "none";
  if (aiPanel)     aiPanel.style.display     = "block";

  // Track conversion when results are unlocked/shown
  if (typeof track === "function") track("ai_result_unlocked");

  // Render AI suggestion
  if (aiText || aiFlags) await renderAiSuggestion();

  return false;
};


    // Request AI suggestion (resilient JSON/text)
    async function renderAiSuggestion() {
      if (!checkBtn || !msgEl) return;

      const message = (msgEl.value || "").trim();

      // If AI is turned off or there's no message, reset and bail
      if (!aiOptIn || !aiOptIn.checked || !message) {
        resetAiSuggestionBox();
        return;
      }

      if (aiText)  aiText.textContent = "Generating AI suggestion…";
      if (aiFlags) aiFlags.textContent = "";

      const originalLabel = checkBtn.textContent;
      checkBtn.disabled = true;
      checkBtn.textContent = "Analyzing…";

      try {
        const r = await fetch(AI_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brand: "10DLC Check", message }),
        });

        let data;
        const ct = r.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          data = await r.json();
        } else {
          const txt = await r.text();
          data = (txt && txt.trim().startsWith("{"))
            ? JSON.parse(txt)
            : { suggestion: "", risks: [] };
        }

        if (aiText) {
          aiText.textContent =
            (data?.suggestion || "").trim() || "No suggestion returned.";
        }

        if (aiFlags) {
          aiFlags.textContent =
            Array.isArray(data?.risks) && data.risks.length
              ? "Flags: " + data.risks.map(x => x.message).join(" • ")
              : "";
        }
      } catch (err) {
        console.error("[suggest] error", err);
        if (aiText)  aiText.textContent = "Couldn't reach AI service.";
        if (aiFlags) aiFlags.textContent = "";
      } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = originalLabel;
      }
    }
  })();

  // =========================
  // Pre-click hook (no duplicates)
  // =========================
  (function () {
    const btn     = document.getElementById('checkBtn');
    const aiPanel = document.getElementById('aiPanel');
    const aiText  = document.getElementById('aiSuggestionText');
    const aiFlags = document.getElementById('aiSuggestionFlags');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (aiText)  aiText.textContent = 'Suggestion will appear after you enter your email.';
      if (aiFlags) aiFlags.textContent = '';
      if (aiPanel) aiPanel.style.display = 'none';
    }, true);
  })();

  // =========================
  // Character counter
  // =========================
  (function () {
    const msg = document.getElementById('message');
    const counter = document.getElementById('charCounter');
    if (!msg || !counter) return;
    function updateCount(){
      const len = (msg.value||'').length;
      const seg = len<=160?1:(len<=320?2:'2+');
      counter.textContent = `${len} / 320 (${seg} segment${seg===1?'':'s'})`;
      counter.style.color = len>320 ? '#b91c1c' : (len>160 ? '#b45309' : '#6b7280');
    }
    msg.addEventListener('input', updateCount);
    updateCount();
  })();

  // =========================
// Export bar
// =========================
(function setupExportBar() {
  const results   = document.getElementById('results');
  const exportBar = document.getElementById('exportBar');
  const copyBtn   = document.getElementById('copyReportBtn');
  const emailBtn  = document.getElementById('emailReportBtn');
  if (!results || !exportBar) return;

  new MutationObserver(() => {
    const hasContent = (results.textContent || '').trim().length > 0;
    if (hasContent) exportBar.style.display = 'flex';
  }).observe(results, { childList: true, subtree: true });

  // Copy report (keep as-is)
  copyBtn?.addEventListener('click', () => {
    const text = results.innerText.trim();
    if (!text) return alert('No results to copy.');
    navigator.clipboard.writeText(text)
      .then(() => alert('Report copied to clipboard.'))
      .catch(() => alert('Copy failed.'));
  });

  // Email report — disabled for now
  emailBtn?.addEventListener('click', () => {
    alert('Email sending is coming soon. For now, please copy the report instead.');
    /*
    const subject = encodeURIComponent('10DLC Compliance Report');
    const body    = encodeURIComponent(results.innerText.trim() || '');
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    */
  });
})();


  // =========================
  // Include partials
  // =========================
  (async () => {
    const slots = document.querySelectorAll("[data-include]");
    await Promise.all([...slots].map(async (el) => {
      try {
        const res = await fetch(el.getAttribute("data-include"), { cache: "no-store" });
        if (res.ok) el.innerHTML = await res.text();
      } catch (err) { console.error("Include failed:", err); }
    }));
  })();

  
  
  /* CLEAR BUTTON LOGIC */
(function () {
  const clearBtn = document.getElementById('clearBtn');
  const msg = document.getElementById('message');
  const results = document.getElementById('results');
  const aiPanel = document.getElementById('aiPanel');
  const aiText  = document.getElementById('aiSuggestionText');
  const aiFlags = document.getElementById('aiSuggestionFlags');
  const counter = document.getElementById('charCounter');

  if (!clearBtn) return;

  clearBtn.addEventListener('click', () => {
    if (msg) msg.value = "";
    if (results) results.innerHTML = "";
    if (aiPanel) aiPanel.style.display = "none";
    if (aiText)  aiText.textContent = "Suggestion will appear here.";
    if (aiFlags) aiFlags.textContent = "";
    if (counter) counter.textContent = "0 / 320 (1 segment)";
  });
})();
