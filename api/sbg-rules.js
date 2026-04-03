// api/sbg-rules.js
// Version: 2026-04-02.sbg.full.6
// Changes from v5:
//   - Added all lenders from screenshots (BHG, Gillman Bagley, Good Funding, Headway,
//     Idea Financial, KCG, LCF, Legend Funding, LoanBud, Lynks Capital, Pearl, SmartBiz,
//     Specialty Funding, Revenued, Samson, Rapid Finance, Peac Solutions)
//   - Added "broker" and related lead-gen brokering terms to risky_terms_regex
//   - Added lead_gen_solicitation_regex (new check): catches the exact patterns
//     flagged by the carrier — probing questions, pre-approval claims, cold outreach
//   - Expanded risky_terms_regex with carrier-flagged financial spam triggers:
//     pre-approved, pre-qualify, guaranteed funding, low rate, high-risk,
//     working capital advance, get funded, fast funding, same-day approval,
//     how much do you qualify for, apply now, 100k approved, etc.
//   - urgency_regex expanded with additional carrier-flagged phrases

let STORE = {
  schema: "sbg-10dlc-rules/v1",
  version: "2026-04-02.sbg.full.6",

  defaults: {
    require_brand_in_each_message: false,
    consent_already_granted: true,
    enforce_stop_help_in_copy: false,
    max_urls_per_message: 1,
    forbid_other_lenders: true,
    forbid_pii_requests: true,
    forbid_money_requests: true,
    forbid_risky_terms: true,
    forbid_lead_gen_solicitation: true,   // NEW — catches carrier-flagged probing/cold-outreach phrases
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
    // Boundary: (?:^|[^A-Za-z0-9]) … (?![A-Za-z0-9])  (no lookbehind — Safari safe)
    // ADDED in v6: bhg, gillman bagley, good funding, headway, idea financial,
    //   kcg, lcf, legend funding, loanbud, lynks capital, pearl, smartbiz,
    //   specialty funding, revenued, samson, rapid finance, peac solutions
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
    // ADDED in v6:
    //   broker, brokering, lead gen, cold outreach, pre-approv*, pre-qualif*,
    //   guaranteed funding, get funded, fast funding, same-day approval,
    //   high-risk lender, working capital advance, 100% approval, apply now,
    //   how much do you qualify, what's your revenue, need funding,
    //   looking for capital, looking for funding
    risky_terms_regex:
      "\\b(" +
        // Original terms
        "payday loan|" +
        "cash advance|" +
        "(?<!working )loan(?!\\s?bud)|" +      // "loan" but not "working capital loan" or "loanbud"
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
        // NEW in v6 — broker / lead-gen brokering
        "\\bbroker\\b|" +
        "brokering|" +
        "referral fee|" +
        "finder.?s fee|" +
        "ISO partner|" +
        "revenue share|" +
        // NEW in v6 — carrier-flagged financial spam triggers
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

    // ── NEW: Lead-gen solicitation patterns ────────────────────────────────────
    // Directly addresses the carrier's complaint about probing questions,
    // pre-approval claims, and cold outreach targeting by profession.
    // Examples flagged: "You are looking for help with funding, correct?"
    //                   "Just got 100k approved for you!"
    //                   "Doctor, did you get any financing anytime this year?"
    lead_gen_solicitation_regex:
      "(" +
        // Probing / qualifying questions
        "looking for (help with|capital|funding|financing)(,?\\s?correct)?|" +
        "are you (looking|searching|seeking) for (funding|capital|financing|a loan)|" +
        "do you need (funding|capital|financing|a loan|business funding)|" +
        "did you get (any )?(financing|funding|a loan)|" +
        "have you (applied|been approved|received) (for )?(funding|financing|a loan)|" +
        "interested in (funding|financing|a loan|working capital)|" +
        // Pre-approval / approval claims
        "approved for you|" +
        "just got .{0,20}approved|" +
        "got you approved|" +
        "you.?re (pre[\\s-]?)?approved|" +
        "you qualify for|" +
        "you.?ve been (pre[\\s-]?)?approved|" +
        // Cold professional targeting (doctor, dentist, etc.)
        "(doctor|dentist|attorney|lawyer|physician|contractor|realtor|agent),?.{0,30}(funding|financing|loan|capital|approved)|" +
        // Explicit lead gen / broker solicitation
        "we (buy|purchase|acquire) (leads|data|lists)|" +
        "we can get you funded|" +
        "we.?ll find you (a lender|funding|financing)|" +
        "match(ed)? you with (a lender|funding)|" +
        "best (rate|offer|deal) for you" +
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

    // ── Urgency ─────────────────────────────────────────────────────────────── 
    // EXPANDED in v6 with additional carrier-flagged urgency triggers
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
        // NEW in v6
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
        "apply now" +   // duplicated intentionally — urgency AND risky term
      ")\\b"
  },

  // Editable parts (managed via PUT):
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
