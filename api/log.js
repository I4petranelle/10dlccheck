// api/log.js — tiny error logger -> Slack (or console)
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'POST')   return send(res, 405, { ok: false, error: 'Use POST' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || !body.message) return send(res, 400, { ok: false, error: 'Missing "message"' });

  const payload = {
    ts: new Date().toISOString(),
    where: body.where || 'unknown',
    message: String(body.message || ''),
    stack: body.stack || '',
    meta: body.meta || {},
  };

  // Slack webhook (optional)
  const hook = process.env.SLACK_WEBHOOK_URL || '';
  try {
    if (hook) {
      await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*10DLC Extension Error*`,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: '10DLC Extension Error' } },
            { type: 'section', fields: [
              { type: 'mrkdwn', text: `*Where:*\n${payload.where}` },
              { type: 'mrkdwn', text: `*Time:*\n${payload.ts}` },
            ]},
            { type: 'section', text: { type: 'mrkdwn', text: `*Message:*\n\`\`\`${payload.message}\`\`\`` } },
            ...(payload.stack ? [{ type: 'section', text: { type: 'mrkdwn', text: `*Stack:*\n\`\`\`${payload.stack.slice(0, 3500)}\`\`\`` } }] : []),
            { type: 'context', elements: [{ type: 'mrkdwn', text: `meta: ${JSON.stringify(payload.meta).slice(0, 300)}` }] }
          ]
        }),
      });
    } else {
      console.log('[log] no SLACK_WEBHOOK_URL set; payload:', payload);
    }
    return send(res, 200, { ok: true });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'Failed to notify', detail: String(e) });
  }
};
