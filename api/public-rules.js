// /api/public-rules.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const PUBLIC_RULES = {
      version: "2025.10.25-public",

      // -------------------------------
      // Deterministic Evaluation Order
      // -------------------------------
      evaluationOrder: [
        "shaft",
        "controlledSubstances",
        "scams",
        "highRiskFinancial",
        "getRichQuick",
        "thirdPartyServices",
        "aggressiveFinancialClaims",
        "sensitivePersonalInfo",
        "loginHarvesting",
        "consentScope",
        "optOutDisclosureMissing",
        "urlSecurity",
        "missingBrandIdentification",
        "characterLimit",
        "veryLongSms",
        "aggressiveMarketing",
        "competitorMention",
        "excessiveLinks",
        "excessiveEmoji",
        "repeatedPunctuation"
      ],

      // -------------------------------
      // Scoring System (for UI badges)
      // -------------------------------
      scoring: {
        severityPoints: { low: 1, medium: 3, high: 5 },
        thresholds: {
          pass: 0,
          warn: 3,
          fail: 5
        },
        logic: {
          pass: "No violations or only low-severity advisories.",
          warn: "Contains at least one medium-severity issue.",
          fail: "Contains one or more high-severity rule violations."
        },
        uiColors: {
          pass: "#22c55e", // green
          warn: "#eab308", // amber
          fail: "#dc2626"  // red
        }
      },

      // -------------------------------
      // Core Rules
      // -------------------------------
      characterLimit: {
        limit: 160,
        severity: "low",
        message: "Message exceeds 160 characters (may split into multiple SMS).",
        suggestion: "Shorten to under 160 characters to avoid splitting."
      },

      veryLongSms: {
        limit: 918,
        severity: "medium",
        message: "Message is very long (over ~918 chars).",
        suggestion: "Reduce length to improve deliverability."
      },

      highRiskFinancial: {
        keywords: [
          "payday loan","cash advance","short-term loan",
          "cryptocurrency","crypto","bitcoin",
          "debt collection","stock alert","tax relief"
        ],
        severity: "high",
        message: "High-risk financial services content — may require carrier approval.",
        suggestion: "Use compliant funding or financing language."
      },

      aggressiveFinancialClaims: {
        keywords: [
          "guaranteed approval","instant approval","no credit check",
          "pre-approved","risk-free","no obligation"
        ],
        severity: "high",
        message: "Aggressive financial claims trigger filtering.",
        suggestion: "Avoid guarantees or unverifiable approval promises."
      },

      getRichQuick: {
        keywords: [
          "work from home","make money fast","secret shopper","easy money",
          "multi-level marketing","mlm","get rich","passive income",
          "gift card","prize","winner","congratulations","you’ve won"
        ],
        severity: "high",
        message: "Get-rich-quick or prize language is restricted.",
        suggestion: "Use realistic, transparent value propositions."
      },

      thirdPartyServices: {
        keywords: [
          "debt consolidation","debt relief","credit repair","lead generation","broker"
        ],
        severity: "high",
        message: "Third-party services content is restricted on 10DLC.",
        suggestion: "Promote only your direct, registered services."
      },

      controlledSubstances: {
        keywords: [
          "cannabis","marijuana","weed","thc","cbd","vape","tobacco"
        ],
        severity: "high",
        message: "Controlled-substance content is restricted.",
        suggestion: "Remove all references to controlled substances."
      },

      shaft: {
        keywords: [
          "sex","adult","hate","alcohol","beer","wine","firearm","gun","weapon",
          "tobacco","fuck","shit","damn","bitch"
        ],
        severity: "high",
        message: "Contains SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity).",
        suggestion: "Use professional, family-friendly language."
      },

      scams: {
        keywords: [
          "phishing","fraud","spam","deceptive","fake","scam","virus","malware",
          "click here now","urgent action","verify account","suspended account"
        ],
        severity: "high",
        message: "Potential phishing or scam content detected.",
        suggestion: "Avoid urgency or deceptive phrases; use transparent tone."
      },

      aggressiveMarketing: {
        keywords: [
          "act now","limited time","free money","guaranteed",
          "risk-free","no obligation","call now","urgent","expires today"
        ],
        severity: "high",
        message: "Aggressive marketing language flagged by carriers.",
        suggestion: "Use calm, consultative language instead of pressure tactics."
      },

      consentScope: {
        keywords: [
          "different service","other products","share with partners","sell data","transfer consent"
        ],
        severity: "medium",
        message: "Consent scope may be unclear.",
        suggestion: "Match your messages to the specific opt-in program."
      },

      optOutDisclosureMissing: {
        severity: "medium",
        message: "Missing STOP/HELP disclosure.",
        suggestion: "Include STOP to opt out and HELP for assistance."
      },

      sensitivePersonalInfo: {
        keywords: [
          "ssn","social security","credit card","password","pin","bank account","routing number","cvv"
        ],
        severity: "high",
        message: "Requests for sensitive personal data are prohibited.",
        suggestion: "Use a secure portal for sensitive information."
      },

      loginHarvesting: {
        keywords: [
          "log in","enter your password","verify identity now"
        ],
        severity: "high",
        message: "Login or credential collection language detected.",
        suggestion: "Never request passwords over SMS."
      },

      urlSecurity: {
        shortenerPattern: "(bit\\.ly|tinyurl\\.com|goo\\.gl|t\\.co|is\\.gd|ow\\.ly|rebrand\\.ly|cutt\\.ly)",
        severity: "medium",
        message: "Public link shortener detected.",
        suggestion: "Use a branded HTTPS domain instead."
      },

      missingBrandIdentification: {
        severity: "medium",
        message: "Brand identification missing at start of message.",
        suggestion: "Include your brand name at the beginning (e.g., “Acme: ...”)."
      },

      competitorMention: {
        keywords: ["headway","mulligan","credibly","ondeck","kapitus","pearl","fox","fundation"],
        severity: "low",
        message: "Mentions competitor names — may confuse recipients.",
        suggestion: "Focus on your brand to avoid confusion."
      },

      excessiveLinks: {
        severity: "medium",
        message: "Too many links detected in message.",
        suggestion: "Limit to one main branded HTTPS link."
      },

      excessiveEmoji: {
        severity: "low",
        message: "Contains too many emojis which may look unprofessional.",
        suggestion: "Keep emoji use minimal and business-appropriate."
      },

      repeatedPunctuation: {
        severity: "low",
        message: "Repeated punctuation (e.g., !!! or ???) can appear spammy.",
        suggestion: "Use single punctuation marks for clarity."
      }
    };

    return res.status(200).json(PUBLIC_RULES);
  } catch (e) {
    console.error("[public-rules] error:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
