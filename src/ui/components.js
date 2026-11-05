// Thành phần giao diện dùng chung (theo Apple Human Interface Guidelines).
import { speak, listen, stopListening, canListen } from '../infrastructure/speech.js';
import { scoreSpeech, scoreBand } from '../domain/scoring.js';

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Biểu tượng nét mảnh, bo tròn — tinh thần SF Symbols.
const PATHS = {
  today: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2" fill="currentColor" stroke="none"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13.5C7 18 10 18.5 12 20c2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5V20"/>',
  review: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7"/><path d="M20 4v4.7h-4.7"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3"/><path d="M4 20v-4.7h4.7"/>',
  chat: '<path d="M20.5 11.5c0 4.1-3.8 7.5-8.5 7.5-1.2 0-2.3-.2-3.3-.6L4 19.5l1.3-3.6C4.2 14.7 3.5 13.2 3.5 11.5 3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.5z"/>',
  dict: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 15.5l2.5-7 2.5 7M8.9 13h3.2M15.5 10.5v5M15.5 12.5c0-1.2.8-2 2-2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevron: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  back: '<path d="M15 5.5L8.5 12l6.5 6.5"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.5 2.6-5.3 3.6-8.5 1.9 1.3 2.4 3 2.4 4.6 1-.7 1.6-2 1.6-3.4 2.8 1.8 5.4 4.6 5.4 7.4 0 3.4-2.6 5.9-6.5 5.9z"/>',
  send: '<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>',
  sparkles: '<path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6zM17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  ear: '<path d="M7 9.5a5 5 0 0 1 10 0c0 3-2.5 3.5-2.5 6.5a3 3 0 0 1-5.5 1.7"/><path d="M10 10a2 2 0 0 1 4 0"/>',
  pencil: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>',
  cards: '<rect x="3.5" y="7" width="13" height="13" rx="2.5"/><path d="M8 4h10a2.5 2.5 0 0 1 2.5 2.5V16"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/>',
};

export const icon = (name, size = 22, cls = '') =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`;

export function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2400);
}

// Màn chúc mừng khi xong cả buổi học — phản hồi rõ ràng, không làm gián đoạn lâu.
export function celebrate(title, subtitle) {
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.innerHTML = `<div class="celebrate-card" role="dialog" aria-label="${esc(title)}">
      <div class="celebrate-badge">${icon('check', 40)}</div>
      <h2>${esc(title)}</h2><p>${esc(subtitle)}</p>
      <button class="btn filled block" data-close>Tuyệt!</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  };
  el.addEventListener('click', (e) => (e.target === el || e.target.closest('[data-close]')) && close());
}

// Vòng tiến độ kiểu Activity: nhiều vòng đồng tâm, mỗi vòng một chỉ số.
export function rings(items, size = 112) {
  const stroke = 12;
  const gap = 3;
  return `<svg class="rings" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${items
    .map((it, i) => {
      const r = size / 2 - stroke / 2 - i * (stroke + gap);
      const c = 2 * Math.PI * r;
      const p = Math.max(0, Math.min(1, it.value));
      return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(${it.track})" stroke-width="${stroke}"/>
        <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(${it.color})" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    })
    .join('')}</svg>`;
}

export const progressBar = (value) => `<div class="bar" role="progressbar" aria-valuenow="${Math.round(value * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.round(Math.max(0, Math.min(1, value)) * 100)}%"></span></div>`;

// Nút nghe: data-speak="câu", data-kind="mentor|me", data-slow.
export const speakBtns = (text, kind = 'me') =>
  `<button class="pill" data-speak="${esc(text)}" data-kind="${kind}" aria-label="Nghe">${icon('play', 16)}<span>Nghe</span></button>
   <button class="pill" data-speak="${esc(text)}" data-kind="${kind}" data-slow="1" aria-label="Nghe chậm"><span>Chậm</span></button>`;

let micSeq = 0;
export const micBtn = (target, { free = false, label = 'Nói' } = {}) => {
  const id = `mic${++micSeq}`;
  return `<button class="pill mic" data-mic="${id}" ${free ? 'data-free="1"' : `data-target="${esc(target)}"`} aria-label="Bấm và nói">${icon('mic', 16)}<span>${label}</span></button><div class="mic-out" id="${id}" aria-live="polite"></div>`;
};

export function renderScore(target, said, label = 'Bạn nói') {
  if (!said) return `<span class="secondary">${label === 'Bạn nói' ? 'Không nghe thấy gì. Bấm micro và nói lại nhé.' : 'Hãy gõ những gì bạn nghe được trước.'}</span>`;
  const { score, words } = scoreSpeech(target, said);
  const band = scoreBand(score);
  return `<div class="score ${band}"><b>${score}%</b> ${band === 'good' ? 'Tốt lắm!' : band === 'ok' ? 'Gần được rồi' : 'Thử lại nhé'}</div>
    <div class="words">${words.map((x) => `<span class="${x.ok ? 'hit' : 'miss'}">${esc(x.w)}</span>`).join(' ')}</div>
    <div class="said">${label}: “${esc(said)}”</div>`;
}

let listeningBtn = null;

// Một bộ xử lý chung cho mọi nút Nghe / Nói trong trang.
export function bindSpeechButtons(root) {
  root.addEventListener('click', async (e) => {
    const sp = e.target.closest('[data-speak]');
    if (sp) {
      e.preventDefault();
      speak(sp.dataset.speak, { kind: sp.dataset.kind || 'me', slow: Boolean(sp.dataset.slow) });
      return;
    }
    const mic = e.target.closest('[data-mic]');
    if (!mic) return;
    e.preventDefault();
    if (!canListen) return toast('Trình duyệt này không nhận giọng nói. Dùng Chrome hoặc Safari.');
    if (listeningBtn === mic) return stopListening();
    const out = document.getElementById(mic.dataset.mic);
    listeningBtn = mic;
    mic.classList.add('on');
    out.innerHTML = '<span class="secondary">Đang nghe… nói đi</span>';
    try {
      const said = await listen({ onInterim: (t) => (out.innerHTML = `<span class="secondary">${esc(t)}</span>`) });
      out.innerHTML = mic.dataset.free
        ? said
          ? `<div class="said">Bạn nói: “${esc(said)}”</div>`
          : '<span class="secondary">Không nghe thấy gì.</span>'
        : renderScore(mic.dataset.target, said);
      mic.dispatchEvent(new CustomEvent('spoken', { bubbles: true, detail: said }));
    } catch (err) {
      out.innerHTML = `<span class="err">${esc(err.message)}</span>`;
    } finally {
      mic.classList.remove('on');
      listeningBtn = null;
    }
  });
}

// Khung trang: thanh điều hướng + tiêu đề lớn (Large Title) như iOS.
export function page({ title, subtitle = '', back = null, action = '' }) {
  return `<header class="navbar">
      ${back ? `<a class="nav-back" href="${back.href}">${icon('back', 20)}<span>${esc(back.label)}</span></a>` : '<span></span>'}
      <span class="nav-title">${esc(title)}</span>
      <span class="nav-action">${action}</span>
    </header>
    <div class="large-title"><h1>${esc(title)}</h1>${subtitle ? `<p class="secondary">${subtitle}</p>` : ''}</div>`;
}

export const segmented = (items, active) =>
  `<nav class="segmented" role="tablist">${items
    .map((t) => `<a role="tab" href="${t.href}" class="${t.id === active ? 'active' : ''}" aria-selected="${t.id === active}">${esc(t.label)}</a>`)
    .join('')}</nav>`;
