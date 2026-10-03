// کارت ویدیو (VideoItem در طراحی اصلی) — مشترک بین صفحه‌ی اصلی و صفحه‌ی تماشا

import { t, loc } from './i18n.js';
import { poetById, watchUrl, epTitle } from './data.js';
import { icon } from './icons.js';
import { formatTime, h } from './util.js';

export function videoCard(ep, cat) {
  const p = poetById(cat, ep.poet);
  const isAparat = ep.source?.type === 'aparat';
  const title = epTitle(ep);
  const timed = (ep.verses || []).filter((v) => Number.isFinite(v.t)).length;
  return h(
    'a',
    { class: 'video-item', href: watchUrl(ep), style: `--hue:${p.hue ?? 215}`, 'aria-label': t('card.watch', { title }) },
    h(
      'span',
      { class: 'vi-media' },
      ep.image ? h('img', { src: ep.image, alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'vi-cover', lang: 'fa' }, loc(p.name)),
      h('span', { class: `vi-badge${isAparat ? ' is-aparat' : ''}` }, isAparat ? t('card.aparat') : t('card.self')),
      ep.source?.duration ? h('span', { class: 'vi-dur' }, formatTime(ep.source.duration)) : null,
      h('span', { class: 'vi-play', html: icon('play') })
    ),
    h('span', { class: 'vi-title' }, h('h3', {}, title)),
    h('p', { class: 'vi-meta' }, [loc(p.name), loc(ep.book), timed ? t('card.verses', { n: timed }) : null].filter(Boolean).join(' · '))
  );
}
