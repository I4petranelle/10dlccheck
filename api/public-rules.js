// /api/public-rules.js  — v2026.04.03-usecases.2
// Rule mapping based on:
//   CTIA Messaging Principles and Best Practices (May 2023)
//   Twilio A2P 10DLC Campaign Use Case Types documentation

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const PUBLIC_RULES = {
      version: "2026.04.03-usecases.2",

      // -------------------------------------------------------
      // 10DLC Campaign Use Cases (standard TCR list)
      // -------------------------------------------------------
      useCases: [
        { id: "2fa",                   label: "2FA / OTP",                     icon: "" },
        { id: "account_notification",  label: "Account Notifications",          icon: "" },
        { id: "customer_care",         label: "Customer Care",                  icon: "" },
        { id: "delivery_notification", label: "Delivery Notifications",         icon: "" },
        { id: "fraud_alert",           label: "Fraud Alert Messaging",          icon: "" },
        { id: "higher_education",      label: "Higher Education",               icon: "" },
        { id: "marketing",             label: "Marketing",                      icon: "" },
        { id: "mixed",                 label: "Mixed",                          icon: "" },
        { id: "polling",               label: "Polling and Voting",             icon: "" },
        { id: "psa",                   label: "Public Service Announcement",    icon: "" },
        { id: "security_alert",        label: "Security Alert",                 icon: "" }
      ],

      // -------------------------------------------------------
      // Deterministic Evaluation Order (full set)
      // -------------------------------------------------------
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

      // -------------------------------------------------------
      // Scoring
      // -------------------------------------------------------
      scoring: {
        severityPoints: { low: 1, medium: 3, high: 5 },
        thresholds: { pass: 0, warn: 3, fail: 5 },
        logic: {
          pass: "No violations or only low-severity advisories.",
          warn: "Contains at least one medium-severity issue.",
          fail: "Contains one or more high-severity rule violations."
        },
        uiColors: {
          pass: "#22c55e",
          warn: "#eab308",
          fail: "#dc2626"
        }
      },

      // -------------------------------------------------------
      // RULES
      // -------------------------------------------------------

      // Always prohibited — applies to every use case without exception
      shaft: {
        keywords: [
          "sex","adult","hate","alcohol","beer","wine","firearm","gun","weapon",
          "tobacco","fuck","shit","damn","bitch"
        ],
        severity: "high",
        message: "Contains SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity).",
        suggestion: "Use professional, family-friendly language."
      },

      controlledSubstances: {
        keywords: ["cannabis","marijuana","weed","thc","cbd","vape","tobacco"],
        severity: "high",
        message: "Controlled-substance content is restricted.",
        suggestion: "Remove all references to controlled substances."
      },

      scams: {
        keywords: [
          "phishing","fraud","spam","deceptive","fake","scam","virus","malware",
          "click here now","urgent action","suspended account"
        ],
        severity: "high",
        message: "Potential phishing or scam content detected.",
        suggestion: "Avoid urgency or deceptive phrases. Use a transparent, honest tone."
      },

      sensitivePersonalInfo: {
        keywords: [
          "ssn","social security","credit card","password","pin",
          "bank account","routing number","cvv"
        ],
        severity: "high",
        message: "Requests for sensitive personal data are prohibited.",
        suggestion: "Use a secure portal for sensitive information. Never collect it via SMS."
      },

      // Financial content — applies to use cases where financial language has no
      // legitimate purpose (higher education, customer care, marketing, mixed)
      highRiskFinancial: {
        keywords: [
          "payday loan","cash advance","short-term loan",
          "cryptocurrency","crypto","bitcoin",
          "debt collection","stock alert","tax relief"
        ],
        severity: "high",
        message: "High-risk financial services content may require carrier approval.",
        suggestion: "Use compliant funding or financing language."
      },

      aggressiveFinancialClaims: {
        keywords: [
          "guaranteed approval","instant approval","no credit check",
          "pre-approved","risk-free","no obligation"
        ],
        severity: "high",
        message: "Aggressive financial claims trigger carrier filtering.",
        suggestion: "Avoid guarantees or unverifiable approval promises."
      },

      getRichQuick: {
        keywords: [
          "work from home","make money fast","secret shopper","easy money",
          "multi-level marketing","mlm","get rich","passive income",
          "gift card","prize","winner","congratulations","you've won"
        ],
        severity: "high",
        message: "Get-rich-quick or prize language is restricted.",
        suggestion: "Use realistic, transparent value propositions."
      },

      // Third-party services — applies anywhere a business should only be
      // promoting its own registered services (higher ed, customer care, marketing, mixed)
      thirdPartyServices: {
        keywords: [
          "debt consolidation","debt relief","credit repair","lead generation","broker"
        ],
        severity: "high",
        message: "Third-party services content is restricted on 10DLC.",
        suggestion: "Promote only your direct, registered services."
      },

      // Aggressive marketing — ONLY applies to Marketing and Mixed campaigns
      // per CTIA Section 5.3.1 (promotional content restrictions)
      aggressiveMarketing: {
        keywords: [
          "act now","limited time","free money","guaranteed",
          "call now","urgent","expires today"
        ],
        severity: "high",
        message: "Aggressive marketing language is flagged by carriers.",
        suggestion: "Use calm, consultative language instead of pressure tactics."
      },

      // Login harvesting — off for 2FA and Security Alert where account
      // verification language is expected and legitimate
      loginHarvesting: {
        keywords: [
          "log in","login","sign in","secure login",
          "account verification","verify account","verify your account",
          "needs verification","account suspended","avoid suspension","account locked"
        ],
        severity: "high",
        message: "Login or credential collection language detected.",
        suggestion: "Avoid directing users to log in via SMS. Use neutral notifications instead."
      },

      // Consent scope — applies to all use cases per CTIA Section 5.1.2.2
      consentScope: {
        keywords: [
          "different service","other products","share with partners",
          "sell data","transfer consent"
        ],
        severity: "medium",
        message: "Consent scope may be unclear.",
        suggestion: "Match your messages to the specific opt-in program."
      },

      // Opt-out — required for marketing/promotional use cases per CTIA Section 5.1.3
      // NOT required for transactional/alert use cases (2FA, fraud alert, security alert, delivery)
      optOutDisclosureMissing: {
        severity: "medium",
        message: "Missing STOP/HELP disclosure.",
        suggestion: "Include STOP to opt out and HELP for assistance."
      },

      // URL shorteners — prohibited across all use cases per CTIA Section 5.3.2
      urlSecurity: {
        shortenerPattern: "(bit\\.ly|tinyurl\\.com|goo\\.gl|t\\.co|is\\.gd|ow\\.ly|rebrand\\.ly|cutt\\.ly)",
        severity: "medium",
        message: "Public link shortener detected.",
        suggestion: "Use a branded HTTPS domain instead."
      },

      // Brand ID — required in every message per CTIA Section 5.1.1
      missingBrandIdentification: {
        severity: "medium",
        message: "Brand identification missing at start of message.",
        suggestion: "Include your brand name at the beginning, for example: Acme: ..."
      },

      characterLimit: {
        limit: 160,
        severity: "low",
        message: "Message exceeds 160 characters and may split into multiple SMS.",
        suggestion: "Shorten to under 160 characters to avoid splitting."
      },

      veryLongSms: {
        limit: 918,
        severity: "medium",
        message: "Message is very long and exceeds SMS concatenation limits.",
        suggestion: "Reduce length to improve deliverability."
      },

      // Competitor mentions — applies when a business is promoting itself
      // (customer care, marketing, mixed) — irrelevant for transactional use cases
      competitorMention: {
        keywords: [
          "headway","mulligan","credibly","ondeck","kapitus",
          "pearl","fox","fundation","libertas","byzfunder",
          "forward financing","expansion capital"
        ],
        severity: "low",
        message: "Mentions competitor names which may confuse recipients.",
        suggestion: "Focus on your own brand to avoid confusion."
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
        message: "Repeated punctuation such as !!! or ??? can appear spammy.",
        suggestion: "Use single punctuation marks for clarity."
      },

      // -------------------------------------------------------
      // USE CASE RULE MAP
      // Based on CTIA Messaging Principles (May 2023) and
      // Twilio A2P 10DLC use case documentation.
      //
      // Core principle: shaft, controlledSubstances, scams,
      // sensitivePersonalInfo, urlSecurity, missingBrandIdentification,
      // characterLimit, veryLongSms, excessiveEmoji, repeatedPunctuation
      // apply to EVERY use case without exception.
      // -------------------------------------------------------
      useCaseRules: {

        // 2FA / OTP
        // Transactional only. No promotional content, no opt-out required.
        // Login/verification language is expected and legitimate here.
        "2fa": [
          "shaft", "controlledSubstances", "scams",
          "sensitivePersonalInfo",
          "consentScope",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "excessiveEmoji", "repeatedPunctuation"
        ],

        // Account Notifications
        // Informational alerts only. No promotional content.
        // STOP/HELP recommended per CTIA. Login harvesting applies
        // because account notifications should not direct users to log in.
        "account_notification": [
          "shaft", "controlledSubstances", "scams",
          "sensitivePersonalInfo", "loginHarvesting",
          "consentScope", "optOutDisclosureMissing",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "excessiveEmoji", "repeatedPunctuation"
        ],

        // Customer Care
        // Support and account management. Financial/broker language has no
        // legitimate place here. Competitor mentions are relevant because a
        // lending/financial business doing customer care should not reference
        // competitors. STOP/HELP required per CTIA.
        "customer_care": [
          "shaft", "controlledSubstances", "scams",
          "highRiskFinancial", "aggressiveFinancialClaims", "getRichQuick",
          "thirdPartyServices",
          "sensitivePersonalInfo", "loginHarvesting",
          "consentScope", "optOutDisclosureMissing",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "competitorMention", "excessiveLinks",
          "excessiveEmoji", "repeatedPunctuation"
        ],

        // Delivery Notifications
        // Transactional status updates only. No opt-out required per CTIA.
        // No financial or marketing rules apply.
        "delivery_notification": [
          "shaft", "controlledSubstances", "scams",
          "sensitivePersonalInfo",
          "consentScope",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "excessiveEmoji", "repeatedPunctuation"
        ],

        // Fraud Alert
        // Carrier-sensitive use case. Anti-phishing rules at full strength.
        // Login/account language is expected (e.g., "unusual activity on your account").
        // No opt-out required — these are urgent transactional alerts.
        "fraud_alert": [
          "shaft", "controlledSubstances", "scams",
          "sensitivePersonalInfo",
          "consentScope",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "excessiveEmoji", "repeatedPunctuation"
        ],

        // Higher Education
        // General CTIA rules apply. Financial/broker/third-party language
        // has no legitimate place in higher education messaging.
        // STOP/HELP required. No aggressive marketing.
        "higher_education": [
          "shaft", "controlledSubstances", "scams",
          "highRiskFinancial", "aggressiveFinancialClaims", "getRichQuick",
          "thirdPartyServices",
          "sensitivePersonalInfo", "loginHarvesting",
          "consentScope", "optOutDisclosureMissing",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "excessiveLinks", "excessiveEmoji", "repeatedPunctuation"
        ],

        // Marketing
        // All rules apply. Most regulated use case per CTIA Section 5.1.
        // Express written consent required. STOP/HELP mandatory.
        "marketing": [
          "shaft", "controlledSubstances", "scams",
          "highRiskFinancial", "aggressiveFinancialClaims", "getRichQuick",
          "thirdPartyServices",
          "sensitivePersonalInfo", "loginHarvesting",
          "consentScope", "optOutDisclosureMissing",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "aggressiveMarketing", "competitorMention",
          "excessiveLinks", "excessiveEmoji", "repeatedPunctuation"
        ],

        // Mixed
        // Evaluated under the full Marketing rule set per Twilio documentation.
        // Lower throughput and higher cost than single-use-case campaigns.
        "mixed": [
          "shaft", "controlledSubstances", "scams",
          "highRiskFinancial", "aggressiveFinancialClaims", "getRichQuick",
          "thirdPartyServices",
          "sensitivePersonalInfo", "loginHarvesting",
          "consentScope", "optOutDisclosureMissing",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "aggressiveMarketing", "competitorMention",
          "excessiveLinks", "excessiveEmoji", "repeatedPunctuation"
        ],

        // Polling and Voting
        // Non-political surveys only per Twilio. No marketing language.
        // STOP/HELP required. Get-rich-quick language should never appear
        // in a survey context.
        "polling": [
          "shaft", "controlledSubstances", "scams",
          "getRichQuick",
          "sensitivePersonalInfo", "loginHarvesting",
          "consentScope", "optOutDisclosureMissing",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "excessiveLinks", "excessiveEmoji", "repeatedPunctuation"
        ],

        // Public Service Announcement
        // Informational only. No commercial promotion.
        // STOP/HELP recommended. No financial or marketing rules.
        "psa": [
          "shaft", "controlledSubstances", "scams",
          "sensitivePersonalInfo",
          "consentScope", "optOutDisclosureMissing",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "excessiveLinks", "excessiveEmoji", "repeatedPunctuation"
        ],

        // Security Alert
        // Compromised system notifications. Account-status language is
        // expected and legitimate. No opt-out required — urgent alerts.
        // No marketing or financial rules.
        "security_alert": [
          "shaft", "controlledSubstances", "scams",
          "sensitivePersonalInfo",
          "consentScope",
          "urlSecurity", "missingBrandIdentification",
          "characterLimit", "veryLongSms",
          "excessiveEmoji", "repeatedPunctuation"
        ]
      },

      // -------------------------------------------------------
      // Use-case guidance copy shown in the UI
      // -------------------------------------------------------
      useCaseGuidance: {
        "2fa": {
          headline: "2FA / OTP",
          notes: [
            "Authentication and OTP messages only. No promotional content permitted.",
            "Opt-out disclosure is not required for this use case.",
            "Keep messages short and direct with one action per message."
          ]
        },
        "account_notification": {
          headline: "Account Notifications",
          notes: [
            "Limit content to account status updates only.",
            "No promotional upsells in the same message.",
            "STOP/HELP disclosure is recommended."
          ]
        },
        "customer_care": {
          headline: "Customer Care",
          notes: [
            "Support and account management content is permitted.",
            "No third-party services, broker, or debt consolidation language.",
            "Competitor mentions are flagged even in a support context.",
            "STOP/HELP is required."
          ]
        },
        "delivery_notification": {
          headline: "Delivery Notifications",
          notes: [
            "Shipment and delivery status updates only.",
            "No marketing content or unrelated offers.",
            "Opt-out disclosure is not required for delivery alerts."
          ]
        },
        "fraud_alert": {
          headline: "Fraud Alert Messaging",
          notes: [
            "Phishing detection rules run at heightened sensitivity.",
            "Never request credentials or sensitive data via SMS.",
            "Always identify your brand clearly. Include a callback number or secure URL.",
            "Opt-out disclosure is not required for fraud alerts."
          ]
        },
        "higher_education": {
          headline: "Higher Education",
          notes: [
            "General CTIA rules apply.",
            "No get-rich-quick, broker, or financial promotion language.",
            "Third-party services and debt consolidation language are flagged.",
            "STOP/HELP is required."
          ]
        },
        "marketing": {
          headline: "Marketing",
          notes: [
            "All carrier rules apply. This is the most regulated use case.",
            "Express written consent is required before sending.",
            "STOP/HELP are mandatory in every message.",
            "Brand name is required at the start of each message.",
            "Use a branded HTTPS link. Public shorteners such as bit.ly are flagged."
          ]
        },
        "mixed": {
          headline: "Mixed",
          notes: [
            "Evaluated under the strictest Marketing rule set.",
            "STOP/HELP required.",
            "Expect lower throughput and higher cost per message than single-use campaigns.",
            "Consider splitting into separate campaigns if volume is high."
          ]
        },
        "polling": {
          headline: "Polling and Voting",
          notes: [
            "Non-political surveys and polls only.",
            "No marketing or promotional content permitted.",
            "STOP/HELP is required."
          ]
        },
        "psa": {
          headline: "Public Service Announcement",
          notes: [
            "Informational content only. No commercial promotion.",
            "Identify the sponsoring organization clearly in each message.",
            "STOP/HELP is recommended."
          ]
        },
        "security_alert": {
          headline: "Security Alert",
          notes: [
            "Compromised system notifications only. No marketing content.",
            "Include a verifiable callback number or branded URL.",
            "Opt-out disclosure is not required for security alerts."
          ]
        }
      }
    };

    return res.status(200).json(PUBLIC_RULES);
  } catch (e) {
    console.error("[public-rules] error:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}