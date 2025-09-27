// api/global-count.js
/**
 * Global counter backed by Upstash Redis (works with Vercel KV envs).
 * If env vars are missing, responds with { total: null } so the UI keeps its estimate.
 *
 * Required env vars (Vercel → Project → Settings → Environment Variables):
 * - KV_REST_API_URL   (e.g., https://us1-intense-owl-12345.upstash.io)
 * - KV_REST_API_TOKEN (the REST token)
 *
 * Optionally change KEY name below.
 */
const KEY = '10dlc_global_total';

export default async function handler(req, res) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  // If KV isn’t configured, return null (frontend will fallback to its estimate)
  if (!url || !token) {
    if (req.method === 'POST') {
      // “Pretend” success so UI isn’t blocked; still return null total
      return res.status(200).json({ ok: true, total: null });
    }
    return res.status(200).json({ total: null });
  }

  try {
    if (req.method === 'POST') {
      // Increment global count
      const incrRes = await fetch(`${url}/INCR/${encodeURIComponent(KEY)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await incrRes.json();
      // Upstash returns { result: <number> }
      return res.status(200).json({ ok: true, total: data.result ?? null });
    }

    // GET current value
    const getRes = await fetch(`${url}/GET/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await getRes.json();
    // If key doesn’t exist yet, initialize to 0
    let total = data.result != null ? Number(data.result) : 0;

    // Lazy init if missing
    if (data.result == null) {
      const setRes = await fetch(`${url}/SET/${encodeURIComponent(KEY)}/${0}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      await setRes.json().catch(() => {});
    }

    return res.status(200).json({ total });
  } catch (e) {
    // On any error, don’t break the UI — return null so frontend keeps estimate
    return res.status(200).json({ total: null, error: true });
  }
}
