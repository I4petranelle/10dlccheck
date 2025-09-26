export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, turnstile } = req.body || {};
  if (!message || !turnstile) return res.status(400).json({ ok:false, error:'Missing input' });

  // Verify Turnstile
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET,
      response: turnstile
    })
  }).then(r=>r.json());

  if (!verify.success) {
    return res.status(403).json({ ok:false, error:"Human verification failed" });
  }

// 10DLC compliance rules and checks based on CTIA guidelines and SBG Funding requirements
const complianceRules = {
    characterLimit: {
        limit: 160,
        severity: 'low',
        message: 'Message exceeds 160 characters (may split into multiple SMS)'
    },
    highRiskFinancial: {
        keywords: ['payday loan', 'cash advance', 'short-term loan', 'cryptocurrency', 'crypto', 'bitcoin', 'debt collection', 'stock alert', 'tax relief'],
        severity: 'high',
        message: 'Contains high-risk financial services content - may require special arrangements'
    },
    getRichQuick: {
        keywords: ['work from home', 'make money fast', 'secret shopper', 'easy money', 'multi-level marketing', 'mlm', 'gambling', 'sweepstakes', 'get rich', 'passive income', 'financial dreams', 'dreams come true', 'change your life'],
        severity: 'high',
        message: 'Contains get-rich-quick scheme language - restricted on 10DLC'
    },
    thirdPartyServices: {
        keywords: ['debt consolidation', 'debt relief', 'debt reduction', 'debt forgiveness', 'credit repair', 'lead generation', 'job alert', 'broker'],
        severity: 'high',
        message: 'Contains third-party services content - restricted on 10DLC'
    },
    controlledSubstances: {
        keywords: ['tobacco', 'vaping', 'vape', 'cannabis', 'cbd', 'marijuana', 'weed', 'illegal drug', 'prescription'],
        severity: 'high',
        message: 'Contains controlled substances content - restricted on 10DLC'
    },
    shaft: {
        keywords: ['sex', 'adult', 'hate', 'alcohol', 'beer', 'wine', 'firearm', 'gun', 'weapon', 'tobacco', 'fuck', 'shit', 'damn', 'bitch'],
        severity: 'high',
        message: 'Contains SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity) - restricted on 10DLC'
    },
    scams: {
        keywords: ['phishing', 'fraud', 'spam', 'deceptive', 'fake', 'scam', 'virus', 'malware', 'click here now', 'urgent action', 'verify account', 'suspended account', 'limited time offer'],
        severity: 'high',
        message: 'Contains potential scam/phishing content - strictly prohibited on 10DLC'
    },
    charity: {
        keywords: ['donation', 'donate', 'charity', 'fundraising', 'contribute', 'help victims', 'disaster relief'],
        severity: 'medium',
        message: 'Contains charity/donation content - requires case-by-case approval on 10DLC'
    },
    personalFinancialQuestions: {
        keywords: ['how much do you have outstanding', 'outstanding in total', 'current debt', 'existing loans', 'how much do you owe', 'financial situation', 'credit situation', 'debt situation'],
        severity: 'high',
        message: 'Requesting detailed personal financial information - privacy violation'
    },
    personalInfo: {
        keywords: ['ssn', 'social security', 'credit card', 'password', 'pin number', 'bank account', 'routing number'],
        severity: 'high',
        message: 'Requesting sensitive personal information via SMS violates 10DLC guidelines'
    },
    aggressiveMarketing: {
        keywords: ['act now', 'limited time', 'free money', 'guaranteed', 'risk-free', 'no obligation', 'call now', 'urgent', 'expires today', 'once in lifetime', 'time to kickstart', 'kickstart your', 'dive in', 'make your dreams', 'dreams a reality', 'dont miss out', 'exclusive offer', 'special deal', 'amazing opportunity', 'incredible deal', 'unbelievable offer', 'life-changing', 'transform your life', 'financial breakthrough', 'breakthrough opportunity'],
        severity: 'high',
        message: 'Contains aggressive marketing language that carriers flag as suspicious'
    },
    competitorMention: {
        keywords: ['headway', 'mulligan', 'credibly', 'on deck', 'ondeck', 'libertas', 'alliance funding group', 'cfg', 'peac solutions', 'kcg', 'byzfunder', 'good funding', 'channel partners', 'elevate', 'expansion', 'forward financing', 'fox', 'fundation', 'pearl', 'kapitus'],
        severity: 'low',
        message: 'Message mentions other lenders - may confuse recipients about message sender'
    },
    consentDocumentation: {
        keywords: ['consent documentation', 'opt-in record', 'agreement record'],
        severity: 'low',
        message: 'Ensure consent documentation is maintained per CTIA requirements'
    },
    consentScope: {
        keywords: ['different service', 'other products', 'additional offers', 'partner services'],
        severity: 'medium', 
        message: 'Message content may exceed scope of original consent - verify consent covers this communication type'
    },
    urlSecurity: {
        pattern: /https?:\/\/[^\s]+/gi,
        severity: 'medium',
        message: 'URLs must be from dedicated domains and clearly identify the sender'
    },
    spoofingRisk: {
        keywords: ['different number', 'reply to different', 'not from this number'],
        severity: 'high', 
        message: 'Message spoofing detected - replies may go to different number than sender'
    },
    ftcCompliance: {
        keywords: ['guaranteed', 'risk-free', 'no risk', 'cant lose', 'sure thing', 'easy money'],
        severity: 'high',
        message: 'Content may violate FTC Truth-in-Advertising rules - avoid misleading claims'
    }
};

function performComplianceCheck(message) {
    const issues = [];
    const messageLower = message.toLowerCase();
    const detectedCategories = [];
    
    // Check character limit
    if (message.length > complianceRules.characterLimit.limit) {
        issues.push({
            severity: complianceRules.characterLimit.severity,
            message: `${complianceRules.characterLimit.message} (${message.length} characters)`,
            suggestion: 'Consider shortening the message to fit within 160 characters'
        });
    }

    // Check all restricted content categories with campaign categorization
    const restrictedCategories = [
        { 
            rule: 'highRiskFinancial', 
            categoryName: 'High-Risk Financial Services',
            suggestion: 'Financial services messaging may require special arrangements with carriers',
            impact: 'RESTRICTED - May require carrier pre-approval and enhanced monitoring'
        },
        { 
            rule: 'getRichQuick', 
            categoryName: 'Get Rich Quick Schemes',
            suggestion: 'Get-rich-quick schemes are prohibited - remove this content',
            impact: 'PROHIBITED - Campaign will be rejected'
        },
        { 
            rule: 'thirdPartyServices', 
            categoryName: 'Third-Party Services',
            suggestion: 'Third-party services content is restricted - ensure direct relationship',
            impact: 'RESTRICTED - Requires proof of direct relationship with customers'
        },
        { 
            rule: 'controlledSubstances', 
            categoryName: 'Controlled Substances',
            suggestion: 'Controlled substances content is prohibited on 10DLC',
            impact: 'PROHIBITED - Campaign will be rejected'
        },
        { 
            rule: 'shaft', 
            categoryName: 'SHAFT Content',
            suggestion: 'SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco, Profanity) is prohibited',
            impact: 'PROHIBITED - Campaign will be rejected'
        },
        { 
            rule: 'scams', 
            categoryName: 'Suspicious/Scam Content',
            suggestion: 'This content appears suspicious - ensure legitimate business practices',
            impact: 'PROHIBITED - Campaign will be rejected for suspicious content'
        },
        { 
            rule: 'charity', 
            categoryName: 'Charity/Donation',
            suggestion: 'Charity/donation content requires case-by-case approval',
            impact: 'RESTRICTED - Requires case-by-case approval and extended review'
        },
        { 
            rule: 'personalFinancialQuestions', 
            categoryName: 'Personal Financial Information Request',
            suggestion: 'Avoid requesting detailed financial information via SMS',
            impact: 'PROHIBITED - Privacy violation and potential security risk'
        },
        { 
            rule: 'personalInfo', 
            categoryName: 'Personal Information Request',
            suggestion: 'Never request sensitive personal information via SMS',
            impact: 'PROHIBITED - Violates privacy and security guidelines'
        },
        { 
            rule: 'aggressiveMarketing', 
            categoryName: 'Aggressive Marketing Language',
            suggestion: 'Use professional, non-promotional language to avoid carrier filtering',
            impact: 'HIGH RISK - Carriers actively filter this type of language'
        },
        { 
            rule: 'competitorMention', 
            categoryName: 'Other Lender/Competitor Mention',
            suggestion: 'Mentioning other lenders may confuse recipients - focus on SBG Funding services',
            impact: 'BRANDING CONCERN - May dilute brand messaging and confuse recipients'
        },
        { 
            rule: 'consentDocumentation', 
            categoryName: 'Consent Documentation',
            suggestion: 'Maintain CTIA-required records of consent acquisition',
            impact: 'COMPLIANCE - Ensure proper consent documentation'
        },
        { 
            rule: 'consentScope', 
            categoryName: 'Consent Scope Verification',
            suggestion: 'Verify message content aligns with original consent scope',
            impact: 'COMPLIANCE - May exceed consent boundaries'
        },
        { 
            rule: 'spoofingRisk', 
            categoryName: 'Number Spoofing Risk',
            suggestion: 'Ensure replies go to the same number that sent the message',
            impact: 'PROHIBITED - Number spoofing violates carrier policies'
        },
        { 
            rule: 'ftcCompliance', 
            categoryName: 'FTC Truth-in-Advertising Violation',
            suggestion: 'Remove misleading claims and guarantee language',
            impact: 'PROHIBITED - Violates federal advertising regulations'
        }
    ];

    restrictedCategories.forEach(category => {
        const rule = complianceRules[category.rule];
        if (rule.keywords) {
            const foundWords = rule.keywords.filter(keyword =>
                messageLower.includes(keyword)
            );
            
            if (foundWords.length > 0) {
                issues.push({
                    severity: rule.severity,
                    message: `${rule.message}: "${foundWords.join('", "')}"`,
                    suggestion: category.suggestion
                });

                detectedCategories.push({
                    name: category.categoryName,
                    impact: category.impact,
                    keywords: foundWords,
                    severity: rule.severity
                });
            }
        }
    });

    // Check for URLs with enhanced security requirements
    const urls = message.match(complianceRules.urlSecurity.pattern);
    if (urls) {
        issues.push({
            severity: complianceRules.urlSecurity.severity,
            message: `${complianceRules.urlSecurity.message}: ${urls.length} URL(s) found`,
            suggestion: 'Use dedicated domains with clear sender identification and avoid URL shorteners unless dedicated to your organization'
        });
    }

    return {
        isCompliant: issues.filter(issue => issue.severity === 'high').length === 0,
        issues: issues,
        messageLength: message.length,
        wordCount: message.split(/\s+/).length,
        restrictedContent: issues.filter(issue => issue.severity === 'high').length,
        detectedCategories: detectedCategories
    };
}
