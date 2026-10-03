#!/usr/bin/env node
// شارح — وارد کردنِ ویدیوهای یک کانالِ آپارات به public/data/episodes.json
//
//   node tools/aparat-import.mjs <نام‌کاربری‌کانال> [--limit 20] [--poet hafez] [--write]
//
// بدونِ --write فقط فهرست را نشان می‌دهد. با --write ویدیوهای تازه (شناسه‌ی تکراری نه) به فهرستِ سایت اضافه
// می‌شوند. ابیات از توضیحاتِ هر ویدیو خوانده می‌شوند (هر بیت در یک خط، دو مصراع با «،» یا « / » جدا)؛
// زمانِ ابیات را بعداً در استودیو ثبت کنید — تا آن وقت بیت‌ها در سایت دیده می‌شوند ولی قابل کلیک نیستند.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'public', 'data', 'episodes.json');
const API = 'https://www.aparat.com/etc/api';

const args = process.argv.slice(2);
const channel = args.find((a) => !a.startsWith('--'));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const LIMIT = Number(opt('limit', 1000));
const POET = opt('poet', '');
const WRITE = args.includes('--write');

if (!channel) {
  console.error('usage: node tools/aparat-import.mjs <channel-username> [--limit N] [--poet id] [--write]');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Shaareh importer)' } });
      const text = await r.text();
      return JSON.parse(text);
    } catch (err) {
      if (i === tries) throw new Error(`${url}: ${err.message}`);
      await sleep(1500 * i);
    }
  }
}

/** «مصراع اول،     مصراع دوم.» یا «مصراع اول / مصراع دوم» → {m1, m2} */
function versesFrom(description) {
  const out = [];
  for (const raw of String(description || '').split(/\r?\n/)) {
    const line = raw.trim().replace(/[.۔]$/, '').trim();
    if (!line || /^https?:\/\//.test(line)) continue;
    const parts = line
      .split(/\s+\/\s+|،\s{2,}|\t+/)
      .map((s) => s.trim().replace(/،$/, '').replace(/\s+/g, ' '))
      .filter(Boolean);
    if (parts.length === 2) out.push({ t: null, m1: parts[0], m2: parts[1] });
  }
  return out;
}

const POET_HINTS = [
  ['hafez', /حافظ/],
  ['saeb', /صائب/],
  ['molavi', /مولانا|مولوی|مثنوی/],
  ['saadi', /سعدی|گلستان|بوستان/],
  ['ferdowsi', /فردوسی|شاهنامه/],
  ['khayyam', /خیام/],
];
const guessPoet = (text) => POET || (POET_HINTS.find(([, re]) => re.test(text)) || [''])[0];

// ---------- فهرستِ ویدیوهای کانال ----------
const list = [];
let url = `${API}/videoByUser/username/${encodeURIComponent(channel)}/perpage/50`;
while (url && list.length < LIMIT) {
  const page = await getJson(url);
  const items = page.videobyuser || [];
  if (!items.length) break;
  list.push(...items);
  url = page.ui?.pagingForward || null;
  await sleep(600);
}
const videos = list.slice(0, LIMIT);
console.log(`channel ${channel}: ${videos.length} videos`);

// ---------- جزئیاتِ هر ویدیو ----------
const episodes = [];
for (const item of videos) {
  const d = (await getJson(`${API}/video/videohash/${item.uid}`)).video || {};
  const description = d.description || '';
  const firstLine = description.split(/\r?\n/).map((s) => s.trim()).find(Boolean) || '';
  const verses = versesFrom(description);
  episodes.push({
    id: `aparat-${String(item.uid).toLowerCase()}`,
    title: { fa: item.title },
    poet: guessPoet(`${item.title} ${firstLine}`),
    presenter: firstLine && !versesFrom(firstLine).length ? { fa: firstLine } : undefined,
    image: item.big_poster || d.big_poster || '',
    timing: 'draft',
    source: { type: 'aparat', hash: item.uid, duration: Number(item.duration) || 0 },
    verses,
  });
  console.log(`  ${item.uid}  ${String(item.duration).padStart(5)}s  ${String(verses.length).padStart(2)} verses  ${item.title}`);
  await sleep(400);
}

if (!WRITE) {
  console.log('\n(dry run — add --write to save into public/data/episodes.json)');
  process.exit(0);
}

const data = JSON.parse(await readFile(DATA, 'utf8'));
const known = new Set(data.episodes.map((e) => e.source?.hash));
const fresh = episodes.filter((e) => !known.has(e.source.hash)).map((e) => JSON.parse(JSON.stringify(e)));
data.episodes.push(...fresh);
await writeFile(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`\nadded ${fresh.length} episodes (${episodes.length - fresh.length} already existed)`);
