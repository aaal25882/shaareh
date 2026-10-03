// استودیوی زمان‌بندی: ویدیو + متن شعر → شرحِ آماده با ابیاتِ زمان‌دار

import { initSite } from './site.js';
import { t, loc } from './i18n.js';
import { loadCatalog, fetchAparat, aparatEmbedUrl, aparatPageUrl, aparatProxyBase } from './data.js';
import { ShaarehPlayer } from './player.js';
import { icon } from './icons.js';
import { num, formatTime, parseTime, parseAparat, h, store, toast, copyText } from './util.js';

await initSite('studio');
document.title = `${t('studio.pageTitle')} — ${t('title')}`;
for (const el of document.querySelectorAll('.step[data-step]')) el.textContent = num(el.dataset.step);

const $ = (id) => document.getElementById(id);
const player = new ShaarehPlayer($('player'));

const DEFAULT_STATE = {
  kind: 'aparat',
  input: '',
  source: null,
  poemText: '',
  verses: [],
  cursor: 0,
  meta: { title: '', id: '', poet: '', book: '', poem: '', presenter: '', summary: '', ganjoor: '', image: '', draft: false },
};

const S = { ...structuredClone(DEFAULT_STATE), ...store.get('studio:state', {}) };
S.meta = { ...DEFAULT_STATE.meta, ...S.meta };
const undoStack = [];
let catalog = { poets: [], episodes: [] };

const save = () => {
  store.set('studio:state', S);
  renderOutput();
};

// ---------- ۱. منبع ویدیو ----------

const PLACEHOLDERS = { aparat: 'https://www.aparat.com/v/…', url: 'https://example.com/video.mp4', local: '' };

function setKind(kind) {
  S.kind = kind;
  for (const b of document.querySelectorAll('#src-kind .seg-btn')) b.setAttribute('aria-pressed', String(b.dataset.kind === kind));
  const input = $('src-input');
  input.hidden = kind === 'local';
  input.placeholder = PLACEHOLDERS[kind];
  $('src-load').textContent = t(kind === 'local' ? 'studio.chooseFile' : 'studio.load');
  $('local-helper').hidden = true;
}

$('src-kind').addEventListener('click', (e) => {
  const b = e.target.closest('[data-kind]');
  if (b) setKind(b.dataset.kind);
});

$('src-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (S.kind === 'local') return $('src-file').click();
  S.input = $('src-input').value.trim();
  loadSource();
});

$('src-file').addEventListener('change', () => {
  const file = $('src-file').files[0];
  if (!file) return;
  player.loadVideo({ sources: [{ label: t('player.original'), height: 0, url: URL.createObjectURL(file) }] });
  S.source = { type: 'file', url: `media/${file.name}` };
  setStatus(t('studio.fileOpened', { name: file.name }));
  setSyncNote(true);
  save();
});

// فایلِ همان ویدیوی آپارات، فقط برای زمان‌گذاری؛ خروجی همچنان به آپارات اشاره می‌کند
$('helper-pick').addEventListener('click', () => $('helper-file').click());
$('helper-file').addEventListener('change', () => {
  const file = $('helper-file').files[0];
  if (!file) return;
  player.loadVideo({ sources: [{ label: t('player.original'), height: 0, url: URL.createObjectURL(file) }] });
  updateMarkers();
  setStatus(t('studio.helperOpened', { name: file.name }));
  setSyncNote(true);
});

async function loadSource() {
  if (S.kind === 'aparat') {
    const hash = parseAparat(S.input);
    if (!hash) return setStatus(t('studio.invalidAparat'), true);
    S.source = { type: 'aparat', hash };
    if (!S.meta.id) S.meta.id = `aparat-${hash.toLowerCase()}`;
    const embed = (msg, isError) => {
      player.loadEmbed({ url: aparatEmbedUrl(hash), pageUrl: aparatPageUrl(hash) });
      setStatus(msg, isError);
      setSyncNote(false);
      $('local-helper').hidden = false;
    };
    if (!aparatProxyBase()) {
      embed(t('studio.aparatEmbed'));
    } else {
      setStatus(t('studio.loadingAparat'));
      try {
        const data = await fetchAparat(hash);
        if (!data.sources.length) throw new Error('no sources');
        player.loadVideo({ sources: data.sources, poster: data.poster, duration: data.duration });
        S.source.duration = data.duration;
        if (!S.meta.title) S.meta.title = data.title;
        if (!S.meta.presenter) S.meta.presenter = data.channel;
        fillMetaForm();
        setStatus(t('studio.aparatDirect', { title: data.title, d: formatTime(data.duration) }));
        setSyncNote(true);
      } catch {
        embed(t('studio.aparatFail'), true);
      }
    }
  } else if (S.kind === 'url') {
    if (!/^https?:\/\//.test(S.input) && !S.input.startsWith('media/')) return setStatus(t('studio.invalidUrl'), true);
    player.loadVideo({ sources: [{ label: t('player.original'), height: 0, url: S.input }] });
    S.source = { type: 'file', url: S.input };
    setStatus(t('studio.videoLoaded'));
    setSyncNote(true);
  }
  updateMarkers();
  save();
}

player.addEventListener('fatal', () => {
  if (S.source?.type === 'aparat') {
    player.loadEmbed({ url: aparatEmbedUrl(S.source.hash), pageUrl: aparatPageUrl(S.source.hash) });
    setStatus(t('studio.aparatFail'), true);
    setSyncNote(false);
    $('local-helper').hidden = false;
  } else {
    setStatus(t('studio.loadFail'), true);
  }
});

player.addEventListener('loaded', (e) => {
  if (S.source && S.source.type !== 'aparat' && e.detail.duration) {
    S.source.duration = Math.round(e.detail.duration);
    save();
  }
});

function setStatus(text, isError) {
  const el = $('src-status');
  el.textContent = text;
  el.classList.toggle('is-error', !!isError);
}

function setSyncNote(canSync) {
  $('sync-note').textContent = canSync ? '' : t('studio.syncEmbed');
  $('stamp').disabled = !canSync;
}

// ---------- ۲. متن شعر ----------

const SPLIT_RE = /\s+[/|]\s+|\t+/;

function parsePoem(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((line) => {
      const parts = line.split(SPLIT_RE).map((p) => p.trim()).filter(Boolean);
      return parts.length >= 2 ? { m1: parts[0], m2: parts.slice(1).join(' ') } : { text: line };
    });
}

$('poem-apply').addEventListener('click', () => applyPoem($('poem-text').value));

function applyPoem(text) {
  const parsed = parsePoem(text);
  if (!parsed.length) return toast(t('studio.noText'));
  // زمان‌ها و یادداشت‌های قبلی بر اساس ترتیب حفظ می‌شوند
  S.verses = parsed.map((v, i) => ({ ...v, t: S.verses[i]?.t ?? null, note: S.verses[i]?.note || '' }));
  S.poemText = text;
  const firstEmpty = S.verses.findIndex((v) => v.t == null);
  S.cursor = firstEmpty < 0 ? S.verses.length : firstEmpty;
  renderTiming();
  save();
  toast(t('studio.versesReady', { n: S.verses.length }));
}

$('ganjoor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  if (btn) btn.disabled = true;
  try {
    await importGanjoor($('ganjoor-url').value);
  } catch (err) {
    toast(err.message || t('studio.ganjoorNotFound'));
  } finally {
    if (btn) btn.disabled = false;
  }
});

async function importGanjoor(input) {
  let path = String(input || '').trim();
  if (!path) throw new Error(t('studio.ganjoorEmpty'));
  if (/^https?:\/\//.test(path)) {
    const u = new URL(path);
    if (!/(^|\.)ganjoor\.net$/.test(u.hostname)) throw new Error(t('studio.ganjoorHost'));
    path = u.pathname;
  }
  path = '/' + decodeURIComponent(path).replace(/^\/+|\/+$/g, '');
  const r = await fetch(`https://api.ganjoor.net/api/ganjoor/poem?url=${encodeURIComponent(path)}&verseDetails=true`);
  if (!r.ok) throw new Error(t('studio.ganjoorNotFound'));
  const d = await r.json();

  const lines = [];
  const vs = d.verses || [];
  for (let i = 0; i < vs.length; i++) {
    const v = vs[i];
    if (v.versePosition === 0 && vs[i + 1]?.versePosition === 1) {
      lines.push(`${v.text} / ${vs[i + 1].text}`);
      i++;
    } else {
      lines.push(v.text);
    }
  }
  $('poem-text').value = lines.join('\n');
  applyPoem($('poem-text').value);

  const nick = d.category?.poet?.nickname || '';
  const full = d.category?.poet?.name || '';
  const match = catalog.poets.find((p) => {
    const names = typeof p.name === 'object' ? Object.values(p.name) : [p.name];
    return names.includes(nick) || names.some((n) => n && full.includes(n));
  });
  if (match && !S.meta.poet) S.meta.poet = match.id;
  if (!S.meta.poem) S.meta.poem = d.title || '';
  if (!S.meta.book) S.meta.book = d.category?.cat?.title || '';
  S.meta.ganjoor = 'https://ganjoor.net' + (d.fullUrl || path);
  fillMetaForm();
  save();
}

// ---------- ۳. زمان‌بندی ----------

const fraction = (sec) => {
  const f = Math.round((sec % 1) * 10);
  return f ? `.${f}` : '';
};
const timeValue = (sec) => (sec != null ? formatTime(sec, { fa: false }) + fraction(sec) : '');

function renderTiming() {
  const list = $('timing-list');
  if (!S.verses.length) {
    list.replaceChildren(h('li', { class: 'timing-empty' }, t('studio.timingEmpty')));
    updateStampButton();
    return;
  }
  list.replaceChildren(
    ...S.verses.map((v, i) =>
      h(
        'li',
        { class: `trow${i === S.cursor ? ' is-next' : ''}${v.t != null ? ' is-set' : ''}`, dataset: { index: i } },
        h('button', { type: 'button', class: 'tnum', title: t('studio.pickRow'), 'data-do': 'cursor' }, num(i + 1)),
        h('div', { class: 'ttext', lang: 'fa', dir: 'rtl' }, v.text ? h('span', {}, v.text) : [h('span', {}, v.m1), h('span', { class: 'm2' }, v.m2)]),
        h('input', { class: 'ttime', dir: 'ltr', value: timeValue(v.t), placeholder: '--:--', 'aria-label': t('studio.timeOf', { i: i + 1 }), 'data-do': 'time' }),
        h('button', { type: 'button', class: 'tbtn', title: t('studio.stampNow'), 'aria-label': t('studio.stampNow'), 'data-do': 'stamp', html: icon('timer') }),
        h('button', { type: 'button', class: 'tbtn', title: t('studio.playFrom'), 'aria-label': t('studio.playFrom'), 'data-do': 'play', disabled: v.t == null, html: icon('play') }),
        h(
          'details',
          { class: 'tnote', open: !!v.note },
          h('summary', {}, t(v.note ? 'studio.note' : 'studio.addNote')),
          h('textarea', { rows: 2, 'data-do': 'note', placeholder: t('studio.notePlaceholder') }, v.note || '')
        )
      )
    )
  );
  updateStampButton();
  updateMarkers();
}

$('timing-list').addEventListener('click', (e) => {
  const el = e.target.closest('[data-do]');
  if (!el) return;
  const i = Number(el.closest('.trow')?.dataset.index);
  if (!Number.isInteger(i)) return;
  if (el.dataset.do === 'cursor') {
    S.cursor = i;
    renderTiming();
    save();
  } else if (el.dataset.do === 'stamp') {
    stampAt(i);
  } else if (el.dataset.do === 'play') {
    const at = S.verses[i].t;
    if (at != null) player.seek(at, { play: true });
  }
});

$('timing-list').addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.do !== 'time') return;
  const i = Number(el.closest('.trow')?.dataset.index);
  const raw = el.value.trim();
  const at = raw === '' ? null : parseTime(raw);
  if (raw !== '' && at == null) {
    toast(t('studio.badTime'));
    el.value = timeValue(S.verses[i].t);
    return;
  }
  S.verses[i].t = at == null ? null : Math.round(at * 10) / 10;
  renderTiming();
  save();
});

$('timing-list').addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.do !== 'note') return;
  S.verses[Number(el.closest('.trow').dataset.index)].note = el.value.trim();
  save();
});

function stampAt(i) {
  if (!S.verses[i]) return;
  if (!player.canSync) return toast(t('studio.needSync'));
  const at = Math.round(player.currentTime * 10) / 10;
  undoStack.push({ i, prev: S.verses[i].t, cursor: S.cursor });
  S.verses[i].t = at;
  S.cursor = i + 1;
  $('undo').disabled = false;
  renderTiming();
  save();
  $('timing-list').querySelector(`.trow[data-index="${Math.min(S.cursor, S.verses.length - 1)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  toast(t('studio.stamped', { i: i + 1, t: formatTime(at) }));
}

$('stamp').addEventListener('click', () => {
  if (S.cursor >= S.verses.length) return toast(S.verses.length ? t('studio.allDone') : t('studio.noVerses'));
  stampAt(S.cursor);
});

$('undo').addEventListener('click', () => {
  const last = undoStack.pop();
  if (!last) return;
  S.verses[last.i].t = last.prev;
  S.cursor = last.cursor;
  $('undo').disabled = !undoStack.length;
  renderTiming();
  save();
});

document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyT' || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = e.target;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
  e.preventDefault();
  $('stamp').click();
});

function updateStampButton() {
  const label = S.cursor < S.verses.length ? t('studio.stamp', { i: S.cursor + 1 }) : t('studio.allDone');
  $('stamp').innerHTML = `${icon('timer')}<span>${label}</span><kbd>T</kbd>`;
}

function updateMarkers() {
  player.setMarkers(
    S.verses.map((v, i) => ({ t: v.t, index: i, title: v.text || v.m1, m1: v.m1, m2: v.m2, text: v.text })),
    S.verses.length
  );
}

player.addEventListener('timeupdate', (e) => {
  $('now').textContent = formatTime(e.detail.time);
});

// ---------- ۴. مشخصات ----------

function fillMetaForm() {
  const f = $('meta-form');
  for (const [k, v] of Object.entries(S.meta)) {
    const el = f.elements[k];
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
  }
}

$('meta-form').addEventListener('input', (e) => {
  const el = e.target;
  if (!el.name) return;
  S.meta[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  save();
});

// ---------- ۵. خروجی ----------

function buildEpisode() {
  const m = S.meta;
  const ep = {
    id: (m.id || '').trim() || `ep-${Date.now().toString(36)}`,
    title: m.title.trim(),
    poet: m.poet,
    book: m.book.trim(),
    poem: m.poem.trim(),
    presenter: m.presenter.trim(),
    summary: m.summary.trim(),
    image: (m.image || '').trim(),
    ganjoor: m.ganjoor.trim(),
  };
  if (m.draft) ep.timing = 'draft';
  ep.source = S.source || null;
  // ابیات به ترتیبِ شعر؛ بیتِ بی‌زمان در سایت دیده می‌شود ولی قابل کلیک نیست
  ep.verses = S.verses.map((v) => {
    const out = { t: v.t };
    if (v.text) out.text = v.text;
    else Object.assign(out, { m1: v.m1, m2: v.m2 });
    if (v.note) out.note = v.note;
    return out;
  });
  for (const k of Object.keys(ep)) if (ep[k] === '') delete ep[k];
  return ep;
}

function warnings(ep) {
  const out = [];
  if (!ep.source) out.push(t('studio.wSource'));
  if (!ep.title) out.push(t('studio.wTitle'));
  if (!ep.poet) out.push(t('studio.wPoet'));
  if (ep.id && !/^[a-z0-9-]+$/.test(ep.id)) out.push(t('studio.wId'));
  const missing = S.verses.filter((v) => v.t == null).length;
  if (missing) out.push(t('studio.wMissing', { n: missing }));
  if (catalog.episodes.some((e) => e.id === ep.id)) out.push(t('studio.wDup', { id: ep.id }));
  return out;
}

function renderOutput() {
  const ep = buildEpisode();
  $('json-out').value = JSON.stringify(ep, null, 2);
  $('out-warnings').replaceChildren(...warnings(ep).map((w) => h('li', {}, w)));
}

$('out-copy').addEventListener('click', async () => {
  if (await copyText($('json-out').value)) toast(t('studio.copiedJson'));
});

$('out-download').addEventListener('click', () => {
  const ep = buildEpisode();
  const blob = new Blob([JSON.stringify(ep, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `${ep.id}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
});

$('out-preview').addEventListener('click', () => {
  const ep = buildEpisode();
  if (!ep.source) return toast(t('studio.needSource'));
  if (ep.source.type === 'file' && S.kind === 'local') toast(t('studio.localPreview'));
  store.set('studio:preview', ep);
  window.open('watch.html?draft=1', '_blank', 'noopener');
});

$('out-reset').addEventListener('click', () => {
  if (!confirm(t('studio.confirmReset'))) return;
  store.remove('studio:state');
  location.href = 'studio.html';
});

// ---------- راه‌اندازی ----------

try {
  catalog = await loadCatalog();
} catch {
  /* استودیو بدون فهرست هم کار می‌کند */
}
$('meta-form').elements.poet.replaceChildren(h('option', { value: '' }, t('studio.choose')), ...catalog.poets.map((p) => h('option', { value: p.id }, loc(p.name))));

const fromUrl = parseAparat(new URLSearchParams(location.search).get('aparat'));
if (fromUrl && S.source?.hash !== fromUrl) {
  S.kind = 'aparat';
  S.input = `https://www.aparat.com/v/${fromUrl}`;
}

setKind(S.kind);
$('src-input').value = S.input || '';
$('poem-text').value = S.poemText || '';
fillMetaForm();
renderTiming();
renderOutput();
setSyncNote(true);

if (S.kind === 'local' && S.source) setStatus(t('studio.reselect'));
else if (S.input) loadSource();
