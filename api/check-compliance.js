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

  // Example compliance rules (replace with your full logic)
  const issues = [];
  if (!/\bSTOP\b/i.test(message)) issues.push("Missing STOP opt-out");
  if (!/\bHELP\b/i.test(message)) issues.push("Missing HELP contact");
  if (/(bit\.ly|tinyurl\.com|goo\.gl|t\.co)/i.test(message)) issues.push("Public shortener detected");

  let suggestion = message;
  if (issues.includes("Missing HELP contact")) suggestion += " HELP: support@example.com";
  if (issues.includes("Missing STOP opt-out")) suggestion += " Reply STOP to opt out.";

  res.json({
    ok: true,
    issues,
    suggestion
  });
}
