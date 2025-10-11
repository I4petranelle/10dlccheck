// api/sbg-rules.js

// Initial in-memory store (persists only until the serverless function is recycled)
let STORE = {
  schema: "sbg-10dlc-rules/v1",
  version: "2025-10-01.sbg.full.5",

  defaults: {
    require_brand_in_each_message: false,
    consent_already_granted: true,
    enforce_stop_help_in_copy: false,
    max_urls_per_message: 1,
    forbid_other_lenders: true,
    forbid_pii_requests: true,
    forbid_money_requests: true,
    forbid_risky_terms: true,
    enable_shaft_checks: true,
    enable_behavior_checks: true,
    forbid_url_shorteners: true,
    limit_message_length: true,
    sms_single_segment_chars: 160,
    sms_two_segment_chars: 320,
    style_checks: {
      flag_all_caps_threshold: 0.7,
      flag_emoji_threshold: 3,
      flag_urgency_phrases: true
    }
  },

  allowed_terms_suggestions: [
    "working capital",
    "business financing",
    "growth funding",
    "flexible financing options",
    "supporting business expenses",
    "expansion funding",
    "equipment financing",
    "business credit options",
    "revenue-based financing",
    "funding tailored to your business goals",
    "small business capital solutions"
  ],

  patterns: {
    brand_hint: "(?:^|\\b)(sbg(?:\\s|-)?funding|sbg)\\b",
    url: "(https?://\\S+)",

    // No-lookbehind boundaries to avoid false positives and runtime errors
    // Start: (?:^|[^A-Za-z0-9])   End: (?![A-Za-z0-9])
    other_lenders_regex:
      "(?:(?:^|[^A-Za-z0-9]))(headway|mulligan|credibly|on\\s?deck|libertas|alliance(\\s?funding(\\s?group)?)?|cfg(\\s?merchant\\s?solutions)?|peac\\s?solutions?|kcg|byz(funder|funding)|good\\s?fund(ing)?|channel\\s?partners?|elevate|expansion|forward\\s?financing|fox|fundation|pearl|kapitus|rapid(\\s?finance)?|samson|revenued|bitty\\s?advance|smart\\s?biz|backd|idea\\s?financial|everest|vader|blue\\s?vine|can\\s?capital|flexibility\\s?capital|legend\\s?fund(ing)?|fund\\s?through|granite|lcf|fund\\s?canna|vox|loan\\s?bud|wing\\s?lake|lynks?\\s?capital|britecap|velocity\\s?capital|cash\\s?fund|figure)(?![A-Za-z0-9])",
    risky_terms_regex:
      "\\b(payday loan|cash advance|loan|merchant cash advance|mca|short[-\\s]?term loan|bridge loan|instant loan|same[-\\s]?day funding|no[-\\s]?doc loan|guaranteed approval|100% approval|no credit check|bad credit ok|free money|unlimited funding|debt (forgiveness|consolidation|reduction|relief)|credit repair|tax (relief|forgiveness)|earn commissions|paid referrals|lead generation|stock alert|investment loan|crypto funding)\\b",

    // trimmed to remove "driver's license" / "bank login" per your last change
    pii_regex:
      "\\b(ssn|social security|dob|date of birth|routing number|account number|credit card|card number|cvv|cvc|pin|password)\\b",

    money_request_regex:
      "\\b(send (payment|money)|wire|ach|zelle|cash ?app|venmo|paypal|pay a fee|processing fee|upfront fee|deposit|retainer|application fee)\\b",

    shaft_sex_regex: "\\b(adult|porn|xxx|escort|nude|sexual|nsfw|onlyfans)\\b",
    shaft_hate_regex: "\\b(?:racist|white\\s*supremacy|neo[- ]?nazi|kkk)\\b",
    shaft_alcohol_regex:
      "\\b(beer|wine|vodka|whiskey|tequila|rum|cocktail|drink special|happy hour)\\b",
    shaft_firearms_regex:
      "\\b(gun|firearm|rifle|pistol|ammo|silencer|concealed carry)\\b",
    shaft_tobacco_regex:
      "\\b(cigarette|tobacco|vape|e[- ]?cig|nicotine)\\b",
    url_shortener_regex:
      "\\b(bit\\.ly|tinyurl\\.com|t\\.co|goo\\.gl|ow\\.ly|is\\.gd|buff\\.ly|rebrand\\.ly|bitly\\.com|shorturl\\.at|rb\\.gy|lnkd\\.in|cutt\\.ly)\\b",
    emoji_regex: "[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]",
    urgency_regex:
      "\\b(act now|urgent|last chance|limited time|don'?t miss|final hours|today only|offer ends)\\b"
  }, 

  // Editable parts:
  rules: [],
  lenders: []
};

export default async function handler(req, res) {
  // CORS + preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(STORE);
  }

  if (req.method === "PUT") {
    const key = req.headers["x-admin-key"];
    if (key !== process.env.RULES_ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Some runtimes send body as a string — parse if needed
      const raw = req.body ?? {};
      const body = typeof raw === "string" && raw.length ? JSON.parse(raw) : raw;

      STORE = {
        ...STORE, // keep schema/defaults/patterns
        // Accept partial updates; fall back to existing arrays if not provided
        rules: Array.isArray(body.rules) ? body.rules : STORE.rules,
        lenders: Array.isArray(body.lenders) ? body.lenders : STORE.lenders
      };

      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, version: STORE.version });
    } catch (e) {
      return res.status(400).json({ error: "Invalid payload" });
    }
  }

  res.setHeader("Allow", "GET,PUT,OPTIONS");
  return res.status(405).send("Method not allowed");
}
