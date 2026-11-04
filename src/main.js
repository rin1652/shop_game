import './style.css';
import { getDay, save } from './lib/storage.js';
import { loadVoices, stopSpeaking, stopListening } from './lib/speech.js';
import { bindGlobalHandlers, icon } from './lib/ui.js';
import { renderToday, renderReflect } from './views/today.js';
import { renderLessonList, renderLesson } from './views/lessons.js';
import { renderReview } from './views/review.js';
import { renderChat } from './views/chat.js';
import { renderGlossary } from './views/glossary.js';
import { renderSettings } from './views/settings.js';

const NAV = [
  { href: '#/today', label: 'Hôm nay', emoji: '📅' },
  { href: '#/lessons', label: 'Bài học', emoji: '📚' },
  { href: '#/review', label: 'Ôn tập', emoji: '🔁' },
  { href: '#/chat', label: 'AI Mentor', emoji: '💬' },
  { href: '#/glossary', label: 'Từ điển', emoji: '📖' },
];

const app = document.getElementById('app');
app.innerHTML = `
  <header class="top">
    <a href="#/today" class="brand">Tiếng Anh cho QA</a>
    <a href="#/settings" class="btn-icon" aria-label="Cài đặt" title="Cài đặt">${icon('gear', 22)}</a>
  </header>
  <main id="view"></main>
  <nav class="bottom">${NAV.map((n) => `<a href="${n.href}"><span>${n.emoji}</span>${n.label}</a>`).join('')}</nav>
`;
const view = document.getElementById('view');
bindGlobalHandlers(view);

let cleanup = null;

async function route() {
  stopSpeaking();
  stopListening();
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  const raw = location.hash.replace(/^#\/?/, '') || 'today';
  const [path, qs] = raw.split('?');
  const parts = path.split('/');
  const query = new URLSearchParams(qs || '');
  document.querySelectorAll('nav.bottom a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#/' + parts[0]));
  window.scrollTo(0, 0);
  switch (parts[0]) {
    case 'lessons':
      renderLessonList(view);
      break;
    case 'lesson':
      renderLesson(view, parts[1], parts[2]);
      break;
    case 'review':
      renderReview(view);
      break;
    case 'chat':
      cleanup = renderChat(view, query);
      break;
    case 'glossary':
      renderGlossary(view, parts[1]);
      break;
    case 'settings':
      await renderSettings(view);
      break;
    case 'today':
    default:
      if (parts[1] === 'reflect') renderReflect(view);
      else renderToday(view);
  }
}

window.addEventListener('hashchange', route);
loadVoices().then(route);

// Đếm thời gian học thực tế: chỉ tính khi trang đang mở và bạn có thao tác trong 2 phút gần nhất.
let lastActive = Date.now();
['click', 'keydown', 'touchstart', 'scroll'].forEach((ev) => window.addEventListener(ev, () => (lastActive = Date.now()), { passive: true }));
setInterval(() => {
  if (document.visibilityState === 'visible' && Date.now() - lastActive < 120000) {
    getDay().seconds += 10;
    save();
  }
}, 10000);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
