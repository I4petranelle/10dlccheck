{
  "version": "2025.09.29-2",
  "lastUpdated": "2025-09-29",

  "length": {
    "softLimit": 160,
    "concatLimit": 918
  },

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
      "multi-level marketing","mlm","gambling","sweepstakes","get rich","passive income"
    ],
    "severity": "high",
    "message": "Contains get-rich-quick scheme language — restricted on 10DLC",
    "suggestion": "Focus on legitimate business services and professional growth"
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
      "pin number","bank account","routing number"
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
}
