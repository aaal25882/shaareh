'use strict';
// سرور شارح — اختیاری. سایت (پوشه‌ی public) بدون سرور روی GitHub Pages کامل کار می‌کند.
// این سرور دو کار دارد:
//   ۱) اجرای محلیِ سایت هنگام توسعه (فایل‌های استاتیک با پشتیبانی Range برای ویدیو)
//   ۲) پراکسیِ API آپارات (/api/aparat/<شناسه>) تا ویدیوهای آپارات در پلیرِ شارح پخش شوند.
//      روی سرورِ واقعی: HOST=0.0.0.0 ALLOW_ORIGIN=https://<نام>.github.io node server.js
//      و نشانی‌اش را در SITE.aparatProxy (public/js/data.js) بگذارید.
// بدون هیچ وابستگی؛ فقط Node 18 به بالا (برای fetch سراسری).

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const DEV = process.env.SHAAREH_DEV === '1' || process.argv.includes('--dev');
const ROOT = path.join(__dirname, 'public');
const TOOLS = path.join(__dirname, 'tools');

const APARAT_API = 'https://www.aparat.com/etc/api/video/videohash/';
const APARAT_EMBED = 'https://www.aparat.com/video/video/embed/videohash/';
// لینک‌های امضاشده‌ی آپارات چند ساعت اعتبار دارند؛ نیم ساعت کش امن است.
const APARAT_TTL = 30 * 60 * 1000;
const HASH_RE = /^[A-Za-z0-9]{3,24}$/;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    ...BASE_HEADERS,
    'Content-Type': MIME['.json'],
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function sendText(res, status, text) {
  res.writeHead(status, { ...BASE_HEADERS, 'Content-Type': MIME['.txt'] });
  res.end(text);
}

// ---------- آپارات ----------

const aparatCache = new Map();

async function aparatInfo(hash) {
  const hit = aparatCache.get(hash);
  if (hit && hit.expires > Date.now()) return hit.data;

  const r = await fetch(APARAT_API + encodeURIComponent(hash), {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Shaareh)' },
    signal: AbortSignal.timeout(15000),
  });
  if (r.status === 404) throw Object.assign(new Error('ویدیو در آپارات پیدا نشد'), { status: 404 });
  if (!r.ok) throw Object.assign(new Error('پاسخ نامعتبر از آپارات'), { status: 502 });

  const json = await r.json();
  const v = json && json.video;
  if (!v || !v.uid) throw Object.assign(new Error('ویدیو در آپارات پیدا نشد'), { status: 404 });

  const sources = (Array.isArray(v.file_link_all) ? v.file_link_all : [])
    .map((q) => ({
      label: String(q.profile || ''),
      height: parseInt(q.profile, 10) || 0,
      url: Array.isArray(q.urls) ? q.urls[0] : q.urls,
    }))
    .filter((s) => typeof s.url === 'string' && s.url.startsWith('https://'))
    .sort((a, b) => b.height - a.height);
  if (!sources.length && typeof v.file_link === 'string') {
    sources.push({ label: 'auto', height: 0, url: v.file_link });
  }

  const data = {
    hash: v.uid,
    title: v.title || '',
    duration: Number(v.duration) || 0,
    poster: v.big_poster || v.small_poster || '',
    channel: v.sender_name || v.username || '',
    page: 'https://www.aparat.com/v/' + v.uid,
    embed: APARAT_EMBED + v.uid + '/vt/frame',
    sources,
  };
  aparatCache.set(hash, { data, expires: Date.now() + APARAT_TTL });
  return data;
}

// CORS: وقتی سایت روی دامنه‌ی دیگری است (مثلاً GitHub Pages) و این سرور فقط پراکسی است.
// ALLOW_ORIGIN=https://aaal25882.github.io (چند نشانی را با کاما جدا کنید)
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !ALLOW_ORIGINS.length) return;
  if (ALLOW_ORIGINS.includes('*') || ALLOW_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGINS.includes('*') ? '*' : origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
}

async function handleApi(req, res, url) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Max-Age': '86400' });
    return res.end();
  }
  const m = url.pathname.match(/^\/api\/aparat\/([^/]+)$/);
  if (m && req.method === 'GET') {
    const hash = m[1];
    if (!HASH_RE.test(hash)) return sendJson(res, 400, { error: 'شناسه‌ی ویدیو نامعتبر است' });
    try {
      return sendJson(res, 200, await aparatInfo(hash));
    } catch (err) {
      return sendJson(res, err.status || 502, { error: err.message || 'خطا در ارتباط با آپارات' });
    }
  }
  return sendJson(res, 404, { error: 'not found' });
}

// ---------- ابزار توسعه (فقط با npm run dev یا SHAAREH_DEV=1) ----------

const DEV_MEDIA_RE = /^\/__dev\/media\/([a-z0-9-]+\.(?:mp4|jpg|png))$/;
const DEV_MAX_BYTES = 80 * 1024 * 1024;

async function handleDevUpload(req, res, name) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > DEV_MAX_BYTES) return sendJson(res, 413, { error: 'too large' });
    chunks.push(chunk);
  }
  await fsp.mkdir(path.join(ROOT, 'media'), { recursive: true });
  await fsp.writeFile(path.join(ROOT, 'media', name), Buffer.concat(chunks));
  return sendJson(res, 200, { saved: 'media/' + name, bytes: size });
}

// ---------- فایل‌های استاتیک ----------

async function resolveFile(base, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (rel.includes('\0')) return null;
  let file = path.normalize(path.join(base, rel));
  if (file !== base && !file.startsWith(base + path.sep)) return null;
  try {
    let stat = await fsp.stat(file);
    if (stat.isDirectory()) {
      file = path.join(file, 'index.html');
      stat = await fsp.stat(file);
    }
    return stat.isFile() ? { file, stat } : null;
  } catch {
    return null;
  }
}

function serveFile(req, res, { file, stat }) {
  const ext = path.extname(file).toLowerCase();
  const headers = {
    ...BASE_HEADERS,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Last-Modified': stat.mtime.toUTCString(),
    'Cache-Control': ext === '.mp4' || ext === '.jpg' ? 'public, max-age=3600' : 'no-cache',
  };

  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range.trim());
  if (range) {
    let start = range[1] === '' ? null : Number(range[1]);
    let end = range[2] === '' ? null : Number(range[2]);
    if (start === null) {
      // bytes=-500 → پانصد بایت آخر
      start = Math.max(0, stat.size - (end ?? 0));
      end = stat.size - 1;
    } else if (end === null || end >= stat.size) {
      end = stat.size - 1;
    }
    if (start > end || start >= stat.size) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1,
    });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }

  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

// ---------- سرور ----------

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    return sendText(res, 400, 'Bad Request');
  }

  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);

    if (DEV) {
      const m = url.pathname.match(DEV_MEDIA_RE);
      if (m && req.method === 'POST') return await handleDevUpload(req, res, m[1]);
      if (url.pathname.startsWith('/tools/')) {
        const hit = await resolveFile(TOOLS, url.pathname.slice('/tools'.length));
        if (hit) return serveFile(req, res, hit);
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method Not Allowed');

    const hit = await resolveFile(ROOT, url.pathname);
    if (hit) return serveFile(req, res, hit);

    const notFound = await resolveFile(ROOT, '/404.html');
    if (notFound) {
      res.writeHead(404, { ...BASE_HEADERS, 'Content-Type': MIME['.html'] });
      return res.end(req.method === 'HEAD' ? undefined : await fsp.readFile(notFound.file));
    }
    return sendText(res, 404, 'Not Found');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendText(res, 500, 'Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`شارح روی http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT} اجرا شد${DEV ? ' (حالت توسعه)' : ''}`);
});
