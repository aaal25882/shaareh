// صفحه‌ی تماشا (HafezPage در طراحی اصلی): پنل ابیات در راست + پلیر + اطلاعات شرح

import { initSite } from './site.js';
import { t, loc, withLang } from './i18n.js';
import {
  loadCatalog,
  poetById,
  epTitle,
  fetchAparat,
  aparatEmbedUrl,
  aparatPageUrl,
  aparatMode,
  aparatProxyBase,
  loadDraft,
} from './data.js';
import { ShaarehPlayer } from './player.js';
import { VersePanel } from './verses.js';
import { videoCard } from './cards.js';
import { icon } from './icons.js';
import { num, formatTime, h, store, toast, copyText, parseAparat, parseTime } from './util.js';

const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const info = document.getElementById('ep-info');

await initSite('content');
document.title = `${t('watch.loading')} — ${t('title')}`;
main().catch((err) => {
  console.error(err);
  showError(t('watch.loadError'));
});

async function main() {
  const catalog = await loadCatalog();
  const ep = resolveEpisode(catalog);
  if (!ep) return showError(t('watch.notFound'));

  const poet = poetById(catalog, ep.poet);
  const verses = (ep.verses || []).map((v) => ({ ...v, t: Number.isFinite(v.t) ? v.t : null }));
  document.title = `${epTitle(ep)} — ${t('title')}`;

  const panel = new VersePanel(document.getElementById('verse-panel'));
  const player = new ShaarehPlayer(document.getElementById('player'), { fullscreenTarget: stage });

  panel.setData({
    title: loc(ep.poem) || epTitle(ep),
    kicker: [loc(poet.name), loc(ep.book)].filter(Boolean).join(' · '),
    verses,
    duration: ep.source?.duration || 0,
    status: ep.timing === 'draft' ? t('panel.draftTiming') : '',
  });
  player.setMarkers(
    verses.map((v, i) => ({ t: v.t, index: i, title: v.text || v.m1 || '', m1: v.m1, m2: v.m2, text: v.text })),
    verses.length
  );
  player.setMeta({ title: epTitle(ep), artist: loc(poet.name), album: loc(ep.book), artwork: ep.image || ep.source?.poster });

  // ---------- باز و بسته کردن پنل ----------
  const setPanel = (open) => {
    stage.dataset.panel = open ? 'open' : 'closed';
    player.setPanelState(open);
    if (open) setTimeout(() => panel.revealActive(), 520);
  };
  player.addEventListener('panel', () => setPanel(stage.dataset.panel !== 'open'));
  panel.addEventListener('close', () => setPanel(false));
  // با هر ورود به پلیر، پنل ابیات از سمت راست باز می‌شود
  setPanel(false);
  requestAnimationFrame(() => setTimeout(() => setPanel(true), 120));

  // ---------- همگام‌سازی پنل و پلیر ----------
  panel.addEventListener('select', (e) => {
    const v = verses[e.detail.index];
    if (!v || v.t == null) return;
    panel.setActive(e.detail.index, { scroll: false });
    player.seek(v.t, { play: true });
    if (matchMedia('(max-width: 900px)').matches) {
      document.getElementById('player').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  panel.addEventListener('share', async (e) => {
    const url = new URL(withLang(location.href));
    url.searchParams.delete('t');
    url.searchParams.set('v', String(e.detail.index + 1));
    if (await copyText(url.toString())) toast(t('panel.copied', { i: e.detail.index + 1 }));
  });

  let lastSave = 0;
  player.addEventListener('timeupdate', (e) => {
    const time = e.detail.time;
    panel.update(time);
    if (player.canSync && !ep.draft && performance.now() - lastSave > 3000) {
      lastSave = performance.now();
      store.set(`resume:${ep.id}`, Math.floor(time));
    }
  });
  player.addEventListener('loaded', (e) => panel.setDuration(e.detail.duration));
  player.addEventListener('verse', (e) => panel.setActive(e.detail.index));

  // ---------- نقطه‌ی شروع: ?v=بیت ، ?t=زمان ، یا ادامه‌ی تماشای قبلی ----------
  let startAt = 0;
  let autoplay = false;
  const vParam = Number(params.get('v'));
  const tParam = parseTime(params.get('t'));
  if (vParam >= 1 && verses[vParam - 1]?.t != null) {
    startAt = verses[vParam - 1].t;
    autoplay = true;
  } else if (tParam != null) {
    startAt = tParam;
    autoplay = true;
  } else if (ep.source?.type !== 'aparat' || aparatMode() === 'direct') {
    const resume = Number(store.get(`resume:${ep.id}`, 0));
    const d = ep.source?.duration || Infinity;
    if (resume > 5 && resume < d - 10) {
      startAt = resume;
      toast(t('watch.resume', { t: formatTime(resume) }));
    }
  }

  renderInfo(catalog, ep, poet, verses, player);
  await mountSource(ep, player, { startAt, autoplay });
}

function resolveEpisode(catalog) {
  if (params.has('draft')) {
    const d = loadDraft();
    return d ? { ...d, draft: true } : null;
  }
  const id = params.get('id');
  if (id) return catalog.episodes.find((e) => e.id === id) || null;
  const hash = parseAparat(params.get('aparat'));
  if (hash) return { id: `aparat-${hash}`, title: t('watch.aparatVideo'), adhoc: true, source: { type: 'aparat', hash }, verses: [] };
  return null;
}

// ---------- منبع پخش ----------

async function mountSource(ep, player, { startAt, autoplay }) {
  const s = ep.source || {};

  if (s.type === 'file' || s.type === 'url') {
    player.addEventListener('fatal', () => player.showMessage(t('watch.fileError')));
    player.loadVideo({ sources: [{ label: t('player.original'), height: 0, url: s.url }], poster: s.poster || ep.image, startAt, autoplay, duration: s.duration });
    return;
  }

  if (s.type === 'aparat') {
    const embed = (note) =>
      player.loadEmbed({ url: aparatEmbedUrl(s.hash), startAt, autoplay, duration: s.duration, pageUrl: aparatPageUrl(s.hash), note });

    // پخش مستقیم ناموفق بود (مثلاً لینک منقضی) → امبد آپارات
    player.addEventListener('fatal', () => {
      startAt = player.currentTime || startAt;
      embed(t('watch.embedFallback'));
    });

    if (aparatMode() === 'direct') {
      try {
        const data = await fetchAparat(s.hash);
        if (!data.sources.length) throw new Error('no sources');
        if (ep.adhoc) fillAdhoc(ep, data);
        player.loadVideo({ sources: data.sources, poster: ep.image || data.poster, startAt, autoplay, duration: data.duration });
        return;
      } catch (err) {
        console.warn('aparat direct:', err);
        embed(t('watch.embedFallback'));
        return;
      }
    }
    embed();
    if (ep.adhoc && aparatProxyBase()) fetchAparat(s.hash).then((data) => fillAdhoc(ep, data), () => {});
    return;
  }

  player.showMessage(t('watch.noSource'));
}

function fillAdhoc(ep, data) {
  ep.title = data.title || ep.title;
  document.title = `${ep.title} — ${t('title')}`;
  const el = info.querySelector('.ep-title');
  if (el) el.textContent = ep.title;
  const ch = info.querySelector('[data-channel]');
  if (ch && data.channel) ch.textContent = data.channel;
}

// ---------- اطلاعات زیر پلیر ----------

function renderInfo(catalog, ep, poet, verses, player) {
  const s = ep.source || {};
  const isAparat = s.type === 'aparat';
  const fact = (label, value, attrs = {}) => (value ? h('li', {}, h('span', {}, t(label)), h('b', attrs, value)) : null);

  const facts = h(
    'ul',
    { class: 'ep-facts' },
    ep.adhoc ? null : fact('watch.poet', loc(poet.name)),
    fact('watch.book', loc(ep.book)),
    fact('watch.poem', loc(ep.poem)),
    verses.length ? fact('watch.verses', num(verses.length)) : null,
    s.duration ? fact('watch.duration', formatTime(s.duration)) : null,
    fact('watch.presenter', loc(ep.presenter) || (ep.adhoc ? t('card.aparat') : ''), { 'data-channel': '' })
  );

  const links = h(
    'div',
    { class: 'ep-links' },
    ep.ganjoor ? h('a', { class: 'btn btn-ghost btn-sm', href: ep.ganjoor, target: '_blank', rel: 'noopener', html: `${icon('book')}<span>${t('watch.ganjoor')}</span>` }) : null,
    isAparat ? h('a', { class: 'btn btn-ghost btn-sm', href: aparatPageUrl(s.hash), target: '_blank', rel: 'noopener', html: `${icon('external')}<span>${t('watch.openAparat')}</span>` }) : null,
    isAparat && ep.adhoc ? h('a', { class: 'btn btn-ghost btn-sm', href: `studio.html?aparat=${encodeURIComponent(s.hash)}`, html: `${icon('timer')}<span>${t('watch.toStudio')}</span>` }) : null
  );

  // انتخاب پلیر برای آپارات — فقط وقتی پراکسی هست
  let modeSwitch = null;
  if (isAparat && aparatProxyBase()) {
    const mode = aparatMode();
    const opt = (value, label, desc) =>
      h(
        'button',
        {
          type: 'button',
          class: 'seg-btn',
          'aria-pressed': String(mode === value),
          onclick: () => {
            if (aparatMode() === value) return;
            store.set('aparat:mode', value);
            const url = new URL(location.href);
            const at = Math.floor(player.currentTime);
            if (at > 0) url.searchParams.set('t', String(at));
            location.href = url.toString();
          },
        },
        h('b', {}, t(label)),
        h('small', {}, t(desc))
      );
    modeSwitch = h(
      'div',
      { class: 'ep-mode' },
      h('span', { class: 'ep-mode-label' }, t('watch.modeLabel')),
      h('div', { class: 'seg', role: 'group', 'aria-label': t('watch.modeLabel') }, opt('direct', 'watch.modeDirect', 'watch.modeDirectDesc'), opt('embed', 'watch.modeEmbed', 'watch.modeEmbedDesc'))
    );
  }

  const keys = [
    ['Space / K', 'keys.play'],
    ['← / →', 'keys.seek5'],
    ['J / L', 'keys.seek10'],
    ['P / N', 'keys.verse'],
    ['B', 'keys.panel'],
    ['C', 'keys.captions'],
    ['F', 'keys.fullscreen'],
    ['M', 'keys.mute'],
  ];

  const related = catalog.episodes
    .filter((e) => e.id !== ep.id)
    .sort((a, b) => (b.poet === ep.poet) - (a.poet === ep.poet))
    .slice(0, 3);

  info.replaceChildren(
    ...[
    h(
      'div',
      { class: 'ep-main' },
      ep.draft ? h('p', { class: 'ep-draft' }, t('watch.draft')) : null,
      h('p', { class: 'ep-kicker' }, [ep.adhoc ? t('card.aparat') : loc(poet.full) || loc(poet.name), loc(ep.book)].filter(Boolean).join(' · ')),
      h('h1', { class: 'ep-title' }, epTitle(ep)),
      loc(ep.summary) ? h('p', { class: 'ep-summary' }, loc(ep.summary)) : null,
      facts,
      modeSwitch,
      links,
      h('details', { class: 'ep-keys' }, h('summary', {}, t('keys.title')), h('dl', {}, ...keys.flatMap(([k, d]) => [h('dt', { dir: 'ltr' }, k), h('dd', {}, t(d))])))
    ),
    related.length ? h('aside', { class: 'ep-related' }, h('h2', {}, t('watch.related')), ...related.map((e) => videoCard(e, catalog))) : null,
    ].filter(Boolean)
  );
}

function showError(text) {
  stage.hidden = true;
  info.replaceChildren(
    h('div', { class: 'empty-state' }, h('h1', {}, text), h('p', {}, t('watch.notFoundBody')), h('a', { class: 'btn btn-primary', href: 'index.html' }, t('watch.back')))
  );
}
