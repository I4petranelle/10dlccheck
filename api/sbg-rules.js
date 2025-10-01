{
  "schema": "sbg-10dlc-rules/v1",
  "version": "2025-09-29.sbg.full.1",

  "defaults": {
    "require_brand_in_each_message": false,

    "consent_already_granted": true,
    "enforce_stop_help_in_copy": false,

    "max_urls_per_message": 1,
    "forbid_other_lenders": true,
    "forbid_pii_requests": true,
    "forbid_money_requests": true,
    "forbid_risky_terms": true,

    "enable_shaft_checks": true,
    "enable_behavior_checks": true,
    "forbid_url_shorteners": true,

    "limit_message_length": true,
    "sms_single_segment_chars": 160,
    "sms_two_segment_chars": 320,

    "style_checks": {
      "flag_all_caps_threshold": 0.7,
      "flag_emoji_threshold": 3,
      "flag_urgency_phrases": true
    }
  },

  "allowed_terms_suggestions": [
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

  "patterns": {
    "brand_hint": "(?:^|\\b)(sbg funding|sbg)\\b",
    "url": "(https?://\\S+)",

    "other_lenders_regex": "\\b(headway|mulligan|credibly|on\\s?deck|libertas|alliance funding group|cfg|peac solutions|kcg|byzfunder|good funding|channel partners|elevate|expansion|forward financing|fox|fundation|pearl|kapitus|rapid)\\b",

    "risky_terms_regex": "\\b(payday loan|cash advance|merchant cash advance|mca|short[-\\s]?term loan|bridge loan|instant loan|same[-\\s]?day funding|no[-\\s]?doc loan|guaranteed approval|100% approval|no credit check|bad credit ok|free money|unlimited funding|debt (forgiveness|consolidation|reduction|relief)|credit repair|tax (relief|forgiveness)|earn commissions|paid referrals|lead generation|stock alert|investment loan|crypto funding)\\b",

    "pii_regex": "\\b(ssn|social security|dob|date of birth|driver'?s? license|routing number|account number|bank login|credit card|card number|cvv|cvc|pin|password)\\b",

    "money_request_regex": "\\b(send (payment|money)|wire|ach|zelle|cash ?app|venmo|paypal|pay a fee|processing fee|upfront fee|deposit|retainer|application fee)\\b",

    "shaft_sex_regex": "\\b(adult|porn|xxx|escort|nude|sexual|nsfw|onlyfans)\\b",
    "shaft_hate_regex": "\\b(?:racist|white\\s*supremacy|neo[- ]?nazi|kkk)\\b",
    "shaft_alcohol_regex": "\\b(beer|wine|vodka|whiskey|tequila|rum|cocktail|drink special|happy hour)\\b",
    "shaft_firearms_regex": "\\b(gun|firearm|rifle|pistol|ammo|silencer|concealed carry)\\b",
    "shaft_tobacco_regex": "\\b(cigarette|tobacco|vape|e[- ]?cig|nicotine)\\b",

    "url_shortener_regex": "\\b(bit\\.ly|tinyurl\\.com|t\\.co|goo\\.gl|ow\\.ly|is\\.gd|buff\\.ly|rebrand\\.ly|bitly\\.com|shorturl\\.at|rb\\.gy|lnkd\\.in|cutt\\.ly)\\b",

    "emoji_regex": "[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]",
    "urgency_regex": "\\b(act now|urgent|last chance|limited time|don'?t miss|final hours|today only|offer ends)\\b"
  }
}
