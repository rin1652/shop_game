import { speak, listen, stopListening, scoreSpeech, canListen } from './speech.js';

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

const ICONS = {
  play: '<path d="M8 5v14l11-7z"/>',
  slow: '<path d="M13 5v14l8-7zM3 5v14l8-7z"/>',
  mic: '<path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z"/>',
  check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  gear: '<path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/>',
  send: '<path d="M2 21 23 12 2 3v7l15 2-15 2z"/>',
};

export const icon = (name, size = 20) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[name]}</svg>`;

// Nút đọc: data-speak="câu", data-kind="mentor|me", data-slow
export const speakBtn = (text, kind = 'me', label = 'Nghe') =>
  `<button class="btn-icon" data-speak="${esc(text)}" data-kind="${kind}" title="${label}" aria-label="${label}">${icon('play', 18)}</button>
   <button class="btn-icon" data-speak="${esc(text)}" data-kind="${kind}" data-slow="1" title="Nghe chậm" aria-label="Nghe chậm">${icon('slow', 18)}</button>`;

// Nút micro: nói theo câu mẫu và chấm điểm. Kết quả hiển thị trong .mic-out kế bên.
let micSeq = 0;
export const micBtn = (target, { free = false } = {}) => {
  const id = `mic${++micSeq}`;
  return `<button class="btn-icon mic" data-mic="${id}" ${free ? 'data-free="1"' : `data-target="${esc(target)}"`} title="Nói" aria-label="Bấm và nói">${icon('mic', 18)}</button><div class="mic-out" id="${id}"></div>`;
};

export function renderScore(target, said, label = 'Bạn nói') {
  if (!said) return label === 'Bạn nói' ? '<span class="muted">Không nghe thấy gì. Bấm micro và nói lại nhé.</span>' : '<span class="muted">Hãy gõ những gì bạn nghe được trước.</span>';
  const { score, words } = scoreSpeech(target, said);
  const cls = score >= 80 ? 'good' : score >= 50 ? 'ok' : 'bad';
  return `<div class="score ${cls}"><b>${score}%</b> ${score >= 80 ? 'Tốt lắm!' : score >= 50 ? 'Gần được rồi' : 'Thử lại nhé'}</div>
    <div class="words">${words.map((x) => `<span class="${x.ok ? 'hit' : 'miss'}">${esc(x.w)}</span>`).join(' ')}</div>
    <div class="said">${label}: “${esc(said)}”</div>`;
}

let listeningBtn = null;

export function bindGlobalHandlers(root) {
  root.addEventListener('click', async (e) => {
    const sp = e.target.closest('[data-speak]');
    if (sp) {
      e.preventDefault();
      speak(sp.dataset.speak, { kind: sp.dataset.kind || 'me', slow: Boolean(sp.dataset.slow) });
      return;
    }
    const mic = e.target.closest('[data-mic]');
    if (mic) {
      e.preventDefault();
      if (!canListen) {
        toast('Trình duyệt này không nhận giọng nói. Dùng Chrome hoặc Safari.');
        return;
      }
      if (listeningBtn === mic) {
        stopListening();
        return;
      }
      const out = document.getElementById(mic.dataset.mic);
      listeningBtn = mic;
      mic.classList.add('on');
      out.innerHTML = '<span class="muted">Đang nghe… nói đi</span>';
      try {
        const said = await listen({ onInterim: (t) => (out.innerHTML = `<span class="muted">${esc(t)}</span>`) });
        if (mic.dataset.free) {
          out.innerHTML = said ? `<div class="said">Bạn nói: “${esc(said)}”</div>` : '<span class="muted">Không nghe thấy gì.</span>';
        } else {
          out.innerHTML = renderScore(mic.dataset.target, said);
        }
        mic.dispatchEvent(new CustomEvent('spoken', { bubbles: true, detail: said }));
      } catch (err) {
        out.innerHTML = `<span class="err">${esc(err.message)}</span>`;
      } finally {
        mic.classList.remove('on');
        listeningBtn = null;
      }
    }
  });
}
