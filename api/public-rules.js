// /api/public-rules.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const PUBLIC_RULES = {
    version: "2025.10.11-public",
    length: { softLimit: 160, concatLimit: 918 },
    characterLimit: {
      limit: 160,
      message: "Message exceeds 160 characters (may split).",
      suggestion: "Keep messages concise to avoid splitting."
    },
    veryLongSms: {
      limit: 918,
      message: "Message is too long for SMS concatenation.",
      suggestion: "Reduce message length."
    },
    // ... (all your current rule categories here)

  "length": { "softLimit": 160, "concatLimit": 918 },

  "characterLimit": {
    "limit": 160,
    "severity": "low",
    "message": "Message exceeds 160 characters (may split into multiple SMS)",
    "suggestion": "Shorten your message to under 160 characters to avoid splitting"
  },

  "veryLongSms": {
    "limit": 918,
    "severity": "medium",
    "message": "Message is very long for SMS concatenation (over ~918 characters).",
    "suggestion": "Reduce length to avoid excessive concatenation and carrier filtering risk"
  },

  "highRiskFinancial": {
    "keywords": [
      "payday loan","cash advance","short-term loan",
      "cryptocurrency","crypto","bitcoin",
      "debt collection","stock alert","tax relief"
    ],
    "severity": "high",
    "message": "Contains high-risk financial services content — may require special arrangements",
    "suggestion": "Replace with general business funding language"
  },

  "getRichQuick": {
    "keywords": [
      "work from home","make money fast","secret shopper","easy money",
      "multi-level marketing","mlm","gambling","sweepstakes","get rich","passive income",
       "gift card","prize","winner","congratulations","you’ve won","youve won","you won"
    ],
    "severity": "high",
    "message": "Contains get-rich-quick / prize language — restricted on 10DLC",
    "suggestion": "Use clear, honest value; avoid sweepstakes or unrealistic earnings claims"
  },

  "thirdPartyServices": {
    "keywords": [
      "debt consolidation","debt relief","debt reduction","debt forgiveness",
      "credit repair","lead generation","job alert","broker"
    ],
    "severity": "high",
    "message": "Contains third-party services content — restricted on 10DLC",
    "suggestion": "Focus on direct services only"
  },

  "controlledSubstances": {
    "keywords": [
      "tobacco","vaping","vape","cannabis","cbd","marijuana","weed","illegal drug","prescription"
    ],
    "severity": "high",
    "message": "Contains controlled substances content — restricted on 10DLC",
    "suggestion": "Remove all references to controlled substances"
  },

  "shaft": {
    "keywords": [
      "sex","adult","hate","alcohol","beer","wine",
      "firearm","gun","weapon","tobacco",
      "fuck","shit","damn","bitch"
    ],
    "severity": "high",
    "message": "Contains SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity) — restricted on 10DLC",
    "suggestion": "Use professional, family-friendly language"
  },

  "scams": {
    "keywords": [
      "phishing","fraud","spam","deceptive","fake","scam","virus","malware",
      "click here now","urgent action","verify account","suspended account"
    ],
    "severity": "high",
    "message": "Contains potential scam/phishing content — strictly prohibited on 10DLC",
    "suggestion": "Use transparent, honest communication without urgency tactics"
  },

  "aggressiveMarketing": {
    "keywords": [
      "act now","limited time","free money","guaranteed",
      "risk-free","no obligation","call now","urgent","expires today"
    ],
    "severity": "high",
    "message": "Contains aggressive marketing language that carriers flag as suspicious",
    "suggestion": "Use professional, consultative language instead of high-pressure tactics"
  },

   "personalInfo": {
    "keywords": [
      "ssn","social security","credit card","password",
      "pin number","bank account","routing number","account number","cvv"
    ],
    "severity": "high",
    "message": "Requesting sensitive personal information via SMS violates 10DLC guidelines",
    "suggestion": "Direct users to a secure portal for sensitive information"
  },

  "advice": {
    "linkTip": "Consider adding a helpful link (if relevant).",
    "optOutTip": "Include STOP to opt out and HELP for assistance when opt-in is unknown.",
    "optOutTipExcludeModes": ["pill"]
  }
   return res.status(200).json(PUBLIC_RULES);
};
