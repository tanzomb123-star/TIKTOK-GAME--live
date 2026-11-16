import { connect, hubUrl } from '../net.js';
import { sanitizeName } from '../core/safety.js';
import { createStats, addEvent, topBy, giftsByName, toCsv } from './stats.js';

const $ = (id) => document.getElementById(id);
let stats = createStats(Date.now());
let filter = 'all';
let query = '';
let dirty = true;

const ICON = { gift: '🎁', comment: '💬', like: '❤️', join: '👋', follow: '➕', share: '🔗' };
const fmt = (x) => Number(x).toLocaleString('th-TH');
const time = (t) => new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function describe(e) {
  switch (e.type) {
    case 'gift': return `ส่ง ${e.giftName || 'ของขวัญ'} • ${fmt(e.diamonds)} เพชร`;
    case 'comment': return e.text ?? '';
    case 'like': return `กดไลก์ ${fmt(e.count)} ครั้ง`;
    case 'join': return 'เข้าห้อง';
    case 'follow': return 'กดติดตาม';
    case 'share': return 'แชร์ไลฟ์';
    default: return '';
  }
}

function matches(e) {
  const kind = ['gift', 'comment', 'like'].includes(e.type) ? e.type : 'other';
  if (filter !== 'all' && filter !== kind) return false;
  if (!query) return true;
  return `${e.nickname ?? ''} ${e.text ?? ''} ${e.giftName ?? ''}`.toLowerCase().includes(query);
}

function li(children, cls) {
  const el = document.createElement('li');
  if (cls) el.className = cls;
  for (const c of children) el.append(c);
  return el;
}
function span(text, cls) { const s = document.createElement('span'); s.className = cls; s.textContent = text; return s; }

function renderFeed() {
  const rows = stats.feed.filter(matches).slice(0, 150);
  const ol = $('feed');
  ol.replaceChildren(...(rows.length ? rows.map((e) => {
    const body = document.createElement('span');
    body.className = 'what';
    body.append(span(sanitizeName(e.nickname || ''), 'who'), document.createTextNode(describe(e)));
    return li([span(time(e.t), 'time'), span(ICON[e.type] || '•', 'icon'), body], e.type);
  }) : [li([document.createTextNode('ยังไม่มีข้อมูล')], 'empty')]));
}

function renderRank(id, list, key, unit) {
  $(id).replaceChildren(...(list.length ? list.map((u, i) => {
    const b = document.createElement('b');
    b.textContent = `${fmt(u[key])} ${unit}`;
    return li([span(`${i + 1}. ${sanitizeName(u.nickname)}`, 'n'), b]);
  }) : [li([span('ยังไม่มี', 'n')])]));
}

function render() {
  const t = stats.totals;
  for (const k of Object.keys(t)) $(`k-${k}`).textContent = fmt(t[k]);
  $('k-viewers').textContent = fmt(stats.viewers.now);
  $('k-peak').textContent = `สูงสุด ${fmt(stats.viewers.peak)}`;
  $('demo').hidden = !stats.demo;
  renderFeed();
  renderRank('top-gifters', topBy(stats, 'diamonds', 10), 'diamonds', 'เพชร');
  renderRank('top-commenters', topBy(stats, 'comments', 10), 'comments', 'ข้อความ');
  const rows = giftsByName(stats).map((g) => {
    const tr = document.createElement('tr');
    for (const v of [g.name, fmt(g.count), fmt(g.diamonds)]) { const td = document.createElement('td'); td.textContent = v; tr.append(td); }
    return tr;
  });
  $('gift-types').replaceChildren(...rows);
}

function tickUptime() {
  const s = Math.floor((Date.now() - stats.startedAt) / 1000);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  $('uptime').textContent = `เริ่มนับ ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

connect(hubUrl(location), (e) => { if (addEvent(stats, e, Date.now())) dirty = true; }, (st) => {
  const el = $('status');
  el.textContent = st === 'open' ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ… (เปิดเซิร์ฟเวอร์หรือยัง?)';
  el.className = `pill ${st === 'open' ? 'on' : 'off'}`;
});

$('filters').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  filter = b.dataset.f;
  for (const x of $('filters').children) x.classList.toggle('on', x === b);
  dirty = true;
});
$('search').addEventListener('input', (ev) => { query = ev.target.value.trim().toLowerCase(); dirty = true; });
$('export').addEventListener('click', () => {
  const blob = new Blob(['﻿' + toCsv(stats)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `live-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('reset').addEventListener('click', () => {
  if (confirm('ล้างข้อมูลทั้งหมดในหน้านี้? (ส่งออก CSV ก่อนถ้าต้องการเก็บ)')) { stats = createStats(Date.now()); dirty = true; }
});

setInterval(() => { if (dirty) { dirty = false; render(); } tickUptime(); }, 500);
render();
tickUptime();
