// شارح — پراکسیِ آپارات روی Cloudflare Workers (اختیاری؛ جایگزینِ server.js وقتی سرور ندارید)
//
// چرا لازم است: API آپارات اجازه‌ی درخواستِ مستقیم از مرورگر (CORS) نمی‌دهد. این پراکسی فقط اطلاعاتِ کوچکِ ویدیو
// و لینک‌های امضاشده‌ی فایل را برمی‌گرداند؛ خودِ ویدیو مستقیم از CDN آپارات به بیننده می‌رسد.
//
// راه‌اندازی:
//   ۱) در داشبورد Cloudflare یک Worker بسازید و این فایل را در آن بگذارید.
//   ۲) متغیرِ ALLOW_ORIGIN را برابرِ نشانیِ سایت بگذارید (مثلاً https://aaal25882.github.io).
//   ۳) نشانیِ Worker را با مسیرِ /api/aparat/ در SITE.aparatProxy (public/js/data.js) بگذارید.

const APARAT_API = 'https://www.aparat.com/etc/api/video/videohash/';
const APARAT_EMBED = 'https://www.aparat.com/video/video/embed/videohash/';
const HASH_RE = /^[A-Za-z0-9]{3,24}$/;
const CACHE_SECONDS = 1800;

function corsHeaders(request, env) {
  const allowed = String(env.ALLOW_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const headers = { Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  if (allowed.includes('*')) headers['Access-Control-Allow-Origin'] = '*';
  else if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

async function aparatInfo(hash) {
  const r = await fetch(APARAT_API + encodeURIComponent(hash), {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Shaareh)' },
    cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
  });
  if (r.status === 404) return { status: 404, body: { error: 'not found' } };
  if (!r.ok) return { status: 502, body: { error: 'bad response from aparat' } };
  const v = (await r.json())?.video;
  if (!v || !v.uid) return { status: 404, body: { error: 'not found' } };
  const sources = (Array.isArray(v.file_link_all) ? v.file_link_all : [])
    .map((q) => ({ label: String(q.profile || ''), height: parseInt(q.profile, 10) || 0, url: Array.isArray(q.urls) ? q.urls[0] : q.urls }))
    .filter((s) => typeof s.url === 'string' && s.url.startsWith('https://'))
    .sort((a, b) => b.height - a.height);
  if (!sources.length && typeof v.file_link === 'string') sources.push({ label: 'auto', height: 0, url: v.file_link });
  return {
    status: 200,
    body: {
      hash: v.uid,
      title: v.title || '',
      duration: Number(v.duration) || 0,
      poster: v.big_poster || v.small_poster || '',
      channel: v.sender_name || v.username || '',
      page: 'https://www.aparat.com/v/' + v.uid,
      embed: APARAT_EMBED + v.uid + '/vt/frame',
      sources,
    },
  };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Max-Age': '86400' } });
    const m = new URL(request.url).pathname.match(/\/api\/aparat\/([^/]+)$/);
    if (!m || request.method !== 'GET') return json({ error: 'not found' }, 404, cors);
    if (!HASH_RE.test(m[1])) return json({ error: 'invalid id' }, 400, cors);
    try {
      const { status, body } = await aparatInfo(m[1]);
      return json(body, status, cors);
    } catch {
      return json({ error: 'aparat unreachable' }, 502, cors);
    }
  },
};
