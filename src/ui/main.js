// Composition root: gắn bản cài đặt thật (localStorage, giọng nói trình duyệt, nhà cung cấp AI) vào tầng
// application, dựng khung giao diện và điều hướng. Đây là nơi duy nhất biết đến mọi tầng.
import './styles/app.css';
import { setPorts } from '../application/ports.js';
import { createLocalStore } from '../infrastructure/localStore.js';
import { createAIGateway } from '../infrastructure/ai/index.js';
import { loadVoices, stopSpeaking, stopListening, setVoicePreferences } from '../infrastructure/speech.js';
import { dayKey } from '../domain/calendar.js';
import { settings } from '../application/preferences.js';
import { addStudyTime } from '../application/progress.js';
import { cardStats } from '../application/review.js';
import { bindSpeechButtons, icon } from './components.js';
import { renderToday, renderReflect } from './views/today.js';
import { renderLessonList, renderLesson } from './views/lessons.js';
import { renderReview } from './views/review.js';
import { renderChat } from './views/chat.js';
import { renderGlossary } from './views/glossary.js';
import { renderSettings } from './views/settings.js';
import { renderExam } from './views/exam.js';

setPorts({ store: createLocalStore(), clock: { today: () => dayKey() }, ai: createAIGateway() });
setVoicePreferences(() => settings());
document.documentElement.dataset.size = settings().textSize || 'm';

const TABS = [
  { href: '#/today', label: 'Hôm nay', icon: 'today', match: ['today', 'exam', 'settings'] },
  { href: '#/lessons', label: 'Bài học', icon: 'book', match: ['lessons', 'lesson'] },
  { href: '#/review', label: 'Ôn tập', icon: 'review', match: ['review'] },
  { href: '#/chat', label: 'AI Mentor', icon: 'chat', match: ['chat'] },
  { href: '#/glossary', label: 'Từ điển', icon: 'dict', match: ['glossary'] },
];

const app = document.getElementById('app');
app.innerHTML = `
  <main id="view"></main>
  <nav class="tabbar bottom" aria-label="Điều hướng chính">${TABS.map(
    (t) => `<a href="${t.href}" data-tab="${t.match.join(' ')}"><span class="tab-ic">${icon(t.icon, 26)}</span>${t.label}</a>`,
  ).join('')}</nav>
`;
const view = document.getElementById('view');
bindSpeechButtons(view);

function updateTabs(section) {
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab.split(' ').includes(section)));
  const due = cardStats().due;
  const reviewIc = document.querySelector('.tabbar a[href="#/review"] .tab-ic');
  reviewIc.querySelector('.badge-dot')?.remove();
  if (due) reviewIc.insertAdjacentHTML('beforeend', `<span class="badge-dot">${due > 99 ? '99+' : due}</span>`);
}

// Thanh điều hướng hiện tiêu đề nhỏ khi tiêu đề lớn cuộn khuất (như iOS).
let titleObserver = null;
function watchLargeTitle() {
  titleObserver?.disconnect();
  const nav = view.querySelector('.navbar');
  const title = view.querySelector('.large-title');
  if (!nav || !title || !('IntersectionObserver' in window)) return;
  titleObserver = new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting), { rootMargin: '-44px 0px 0px 0px' });
  titleObserver.observe(title);
}

const settingsLink = () =>
  `<a href="#/settings" class="round" aria-label="Cài đặt" style="background:transparent">${icon('gear', 24)}</a>`;

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
    case 'exam':
      renderExam(view);
      break;
    case 'today':
    default:
      if (parts[1] === 'reflect') renderReflect(view);
      else renderToday(view);
  }
  // Nút Cài đặt ở góc phải các trang chính.
  const action = view.querySelector('.nav-action');
  if (action && !action.innerHTML && ['today', 'lessons', 'review', 'glossary', ''].includes(parts[0])) action.innerHTML = settingsLink();
  updateTabs(parts[0] || 'today');
  watchLargeTitle();
}

window.addEventListener('hashchange', route);
loadVoices().then(route);

// Thời gian học thực tế: chỉ tính khi trang đang mở và có thao tác trong 2 phút gần nhất.
let lastActive = Date.now();
['click', 'keydown', 'touchstart', 'scroll'].forEach((ev) => window.addEventListener(ev, () => (lastActive = Date.now()), { passive: true }));
setInterval(() => {
  if (document.visibilityState === 'visible' && Date.now() - lastActive < 120000) addStudyTime(10);
}, 10000);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
