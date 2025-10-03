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

  const noStore = () => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  };

  if (!url || !token) {
    noStore();
    // Still respond 200 so UI doesn’t break; return null so frontend can fall back.
    return res.status(200).json({ total: null, note: "KV not configured" });
  }

  try {
    if (req.method === 'POST') {
      // Atomic increment
      const r = await fetch(`${url}/INCR/${encodeURIComponent(KEY)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const j = await r.json();
      noStore();
      return res.status(200).json({ ok: true, total: j?.result != null ? Number(j.result) : null });
    }

    if (req.method === 'GET') {
      const r = await fetch(`${url}/GET/${encodeURIComponent(KEY)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const j = await r.json();
      let total = j?.result != null ? Number(j.result) : 0;

      // Lazily initialize if missing
      if (j?.result == null) {
        await fetch(`${url}/SET/${encodeURIComponent(KEY)}/0`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        }).catch(() => {});
      }

      noStore();
      return res.status(200).json({ total });
    }

    noStore();
    return res.status(405).end();
  } catch (e) {
    noStore();
    return res.status(200).json({ total: null, error: true, message: e?.message || String(e) });
  }
}
