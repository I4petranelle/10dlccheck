// api/sbg-rules.js
// Version: 2026-04-06.sbg.full.8

let STORE = {
  schema: "sbg-10dlc-rules/v1",
  version: "2026-04-06.sbg.full.8",

  defaults: {
    require_brand_in_each_message: false,
    consent_already_granted: true,
    enforce_stop_help_in_copy: false,
    max_urls_per_message: 1,
    forbid_other_lenders: true,
    forbid_pii_requests: true,
    forbid_money_requests: true,
    forbid_risky_terms: true,
    forbid_lead_gen_solicitation: true,
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

    // ── Other lenders ──────────────────────────────────────────────────────────
    other_lenders_regex:
      "(?:(?:^|[^A-Za-z0-9]))(" +
        "headway|" +
        "mulligan|" +
        "credibly|" +
        "on\\s?deck|" +
        "libertas|" +
        "alliance(\\s?funding(\\s?group)?)?|" +
        "cfg(\\s?merchant\\s?solutions)?|" +
        "peac\\s?solutions?|" +
        "kcg|" +
        "byz(funder|funding)|" +
        "good\\s?fund(ing)?|" +
        "channel\\s?partners?|" +
        "elevate|" +
        "expansion|" +
        "forward\\s?financing|" +
        "fox|" +
        "fundation|" +
        "pearl|" +
        "kapitus|" +
        "rapid(\\s?finance)?|" +
        "samson|" +
        "revenued|" +
        "bitty(\\s?advance)?|" +
        "smart\\s?biz|" +
        "backd|" +
        "idea\\s?financial|" +
        "everest|" +
        "vader|" +
        "blue\\s?vine|" +
        "bluevine|" +
        "can\\s?capital|" +
        "flexibility(\\s?capital)?|" +
        "legend\\s?fund(ing)?|" +
        "fund\\s?through|" +
        "granite|" +
        "lcf|" +
        "fund\\s?canna|" +
        "vox|" +
        "loan\\s?bud|" +
        "loanbud|" +
        "wing\\s?lake|" +
        "lynks?\\s?capital|" +
        "britecap|" +
        "velocity\\s?capital|" +
        "cash\\s?fund|" +
        "figure|" +
        "bhg(\\s?funding)?|" +
        "gillman(\\s?bagley)?|" +
        "specialty\\s?fund(ing)?|" +
        "\\bkcg\\b|" +
        "\\blcf\\b" +
      ")(?![A-Za-z0-9])",

    // ── Risky financial terms ──────────────────────────────────────────────────
    risky_terms_regex:
      "\\b(" +
        "payday loan|" +
        "cash advance|" +
        "(?<!working )loan(?!\\s?bud)|" +
        "merchant cash advance|" +
        "\\bmca\\b|" +
        "short[\\s-]?term loan|" +
        "bridge loan|" +
        "instant loan|" +
        "same[\\s-]?day funding|" +
        "no[\\s-]?doc loan|" +
        "guaranteed approval|" +
        "100% approval|" +
        "no credit check|" +
        "bad credit ok|" +
        "free money|" +
        "unlimited funding|" +
        "debt (forgiveness|consolidation|reduction|relief)|" +
        "credit repair|" +
        "tax (relief|forgiveness)|" +
        "earn commissions|" +
        "paid referrals|" +
        "lead generation|" +
        "stock alert|" +
        "investment loan|" +
        "crypto funding|" +
        "\\bbroker\\b|" +
        "brokering|" +
        "referral fee|" +
        "finder.?s fee|" +
        "ISO partner|" +
        "revenue share|" +
        "pre[\\s-]?approv(ed|al)|" +
        "pre[\\s-]?qualif(y|ied|ication)|" +
        "guaranteed funding|" +
        "get funded|" +
        "fast funding|" +
        "same[\\s-]?day approval|" +
        "high[\\s-]?risk lender|" +
        "working capital advance|" +
        "apply now|" +
        "apply today|" +
        "approved for you|" +
        "just got.*approved|" +
        "need funding|" +
        "looking for (capital|funding|financing)|" +
        "help with funding|" +
        "how much do you qualify|" +
        "what.?s your (monthly )?revenue|" +
        "what.?s your (annual )?revenue|" +
        "100[k]? approved|" +
        "get rich quick|" +
        "make money fast|" +
        "financial independence|" +
        "build your wealth" +
      ")\\b",

    // ── Lead-gen solicitation patterns ────────────────────────────────────────
    // Grounded in:
    //   CTIA §5.1 — promotional messaging requires express written consent
    //   CTIA §5.3.1 — prohibits misleading/deceptive content
    //   T-Mobile CoC §5.2 — disallows Non-Direct Lenders and lead gen
    //   T-Mobile CoC §5.3 — phishing / impersonation
    //   T-Mobile CoC §5.4/5.5 — fraud/scam, deceptive marketing
    lead_gen_solicitation_regex:
      "(" +
        // Unsolicited probing / qualifying questions
        "are you (currently )?(looking|searching|seeking) for [^?]{0,60}(working capital|line of credit|funding|capital|financing|a (business )?loan)|" +
        "do you (currently )?(need|require) (funding|capital|financing|a (business )?loan)|" +
        "did you (ever |recently )?(get|receive|obtain) (any )?(financing|funding|a loan)|" +
        "have you (applied|been approved) (for )?(funding|financing|a loan)|" +
        "looking for (help with|capital|funding|financing)(,?\\s?(correct|right|yes))?|" +
        "you (are|were) (looking|searching) for (funding|capital|financing)(,?\\s?(correct|right))?|" +
        "i.?m curious[^.?!]{0,80}(working capital|line of credit|funding|capital|financing|rates)|" +
        // Deceptive pre-approval / approval claims
        "you.?ve been (pre[\\s-]?)?approved|" +
        "you.?re (pre[\\s-]?)?approved|" +
        "just got .{0,15} approved for you|" +
        "got you (pre[\\s-]?)?approved|" +
        "you qualify for .{0,20}(funding|capital|financing)|" +
        // Non-direct lender / third-party data sharing
        "we (buy|purchase|acquire|sell) (leads|contact lists|data|phone numbers)|" +
        "we.?ll (match|connect) you with (a lender|multiple lenders|funding sources)|" +
        "we work with (multiple|many|hundreds of) lenders|" +
        "submitted (your|the) (information|application|details) to|" +
        "sharing (your|the) (information|details) with|" +
        // Phishing-adjacent impersonation
        "your (bank|lender|financial institution) (has|have) (approved|flagged|reviewed)|" +
        "we.?re (calling|reaching out) on behalf of (your|a) (bank|lender|financial institution)" +
      ")",

    // ── PII ────────────────────────────────────────────────────────────────────
    pii_regex:
      "\\b(ssn|social security|dob|date of birth|routing number|account number|credit card|card number|cvv|cvc|\\bpin\\b|password)\\b",

    // ── Money requests ─────────────────────────────────────────────────────────
    money_request_regex:
      "\\b(send (payment|money)|wire|\\bach\\b|zelle|cash\\s?app|venmo|paypal|pay a fee|processing fee|upfront fee|deposit|retainer|application fee)\\b",

    // ── SHAFT ──────────────────────────────────────────────────────────────────
    shaft_sex_regex:     "\\b(adult|porn|xxx|escort|nude|sexual|nsfw|onlyfans)\\b",
    shaft_hate_regex:    "\\b(?:racist|white\\s*supremacy|neo[- ]?nazi|kkk)\\b",
    shaft_alcohol_regex: "\\b(beer|wine|vodka|whiskey|tequila|rum|cocktail|drink special|happy hour)\\b",
    shaft_firearms_regex:"\\b(gun|firearm|rifle|pistol|ammo|silencer|concealed carry)\\b",
    shaft_tobacco_regex: "\\b(cigarette|tobacco|vape|e[- ]?cig|nicotine)\\b",

    // ── Behavior ───────────────────────────────────────────────────────────────
    url_shortener_regex:
      "\\b(bit\\.ly|tinyurl\\.com|t\\.co|goo\\.gl|ow\\.ly|is\\.gd|buff\\.ly|rebrand\\.ly|bitly\\.com|shorturl\\.at|rb\\.gy|lnkd\\.in|cutt\\.ly)\\b",
    emoji_regex: "[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]",

    // ── Urgency ────────────────────────────────────────────────────────────────
    urgency_regex:
      "\\b(" +
        "act now|" +
        "urgent|" +
        "last chance|" +
        "limited time|" +
        "don.?t miss|" +
        "final hours|" +
        "today only|" +
        "offer ends|" +
        "respond (immediately|now|asap)|" +
        "reply (immediately|now|asap)|" +
        "call (immediately|now|asap|today)|" +
        "don.?t wait|" +
        "don.?t delay|" +
        "time.?sensitive|" +
        "expires? (today|soon|midnight)|" +
        "only \\d+ (spot|seat|opening)s? (left|remaining)|" +
        "while (supplies|funding|spots) last|" +
        "exclusive offer|" +
        "apply now" +
      ")\\b"
  },

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
      const raw = req.body ?? {};
      const body = typeof raw === "string" && raw.length ? JSON.parse(raw) : raw;

      STORE = {
        ...STORE,
        rules:   Array.isArray(body.rules)   ? body.rules   : STORE.rules,
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
