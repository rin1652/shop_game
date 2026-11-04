import { LESSONS, lessonById } from '../data/lessons.js';
import { DAILY_STEPS, METHODS, ROADMAP } from '../data/plan.js';
import { getState, getDay, save, streak, todayKey } from '../lib/storage.js';
import { cardStats } from '../lib/srs.js';
import { hasKey, correctWriting } from '../lib/ai.js';
import { esc, icon, toast, micBtn } from '../lib/ui.js';

export function todayLesson() {
  const s = getState();
  const day = getDay();
  if (day.lessonId && lessonById(day.lessonId)) return lessonById(day.lessonId);
  let lesson = LESSONS.find((l) => !s.lessonDone[l.id]);
  if (!lesson) {
    // Đã học hết: quay lại bài học lâu nhất chưa ôn.
    lesson = [...LESSONS].sort((a, b) => (s.lessonDone[a.id] < s.lessonDone[b.id] ? -1 : 1))[0];
  }
  day.lessonId = lesson.id;
  save();
  return lesson;
}

export function markStep(key, lessonId) {
  const s = getState();
  const day = getDay();
  if (!lessonId || lessonId === day.lessonId || key === 'review' || key === 'reflect') day.steps[key] = true;
  if (lessonId && ['listen', 'phrases', 'roleplay'].includes(key)) {
    s.lessonSteps ||= {};
    const ls = (s.lessonSteps[lessonId] ||= {});
    ls[key] = true;
    if (ls.listen && ls.phrases && ls.roleplay) s.lessonDone[lessonId] = todayKey();
  }
  save();
}

function stepHref(step, lesson) {
  if (step.route.startsWith('lesson:')) return `#/lesson/${lesson.id}/${step.route.split(':')[1]}`;
  return step.route;
}

export function renderToday(el) {
  const s = getState();
  const day = getDay();
  const lesson = todayLesson();
  const done = DAILY_STEPS.filter((st) => day.steps[st.key]).length;
  const mins = Math.floor((day.seconds || 0) / 60);
  const stats = cardStats();
  const pct = Math.round((done / DAILY_STEPS.length) * 100);
  const doneLessons = Object.keys(s.lessonDone).length;

  el.innerHTML = `
    <section class="hero">
      <div class="ring" style="--p:${pct}"><span>${done}/${DAILY_STEPS.length}</span></div>
      <div>
        <h1>Buổi học hôm nay</h1>
        <p class="muted">${mins} / 60 phút · 🔥 ${streak()} ngày liên tiếp · ${doneLessons}/${LESSONS.length} bài</p>
      </div>
    </section>

    <a class="card lesson-card" href="#/lesson/${lesson.id}/dialogue">
      <div class="tag">Bài ${LESSONS.indexOf(lesson) + 1} · Chặng ${lesson.week}</div>
      <h2>${esc(lesson.title)}</h2>
      <p class="muted">${esc(lesson.goal)}</p>
    </a>

    <ol class="steps">
      ${DAILY_STEPS.map(
        (st) => `
        <li class="step ${day.steps[st.key] ? 'done' : ''}">
          <a href="${stepHref(st, lesson)}">
            <span class="dot">${day.steps[st.key] ? icon('check', 16) : st.min + '′'}</span>
            <span class="body">
              <b>${esc(st.title)}${st.key === 'review' && stats.due ? ` <span class="badge">${stats.due} thẻ</span>` : ''}</b>
              <small>${esc(st.desc)}</small>
            </span>
          </a>
        </li>`,
      ).join('')}
    </ol>

    <details class="card">
      <summary><b>Vì sao học như thế này?</b></summary>
      <ul class="methods">${METHODS.map((m) => `<li><b>${esc(m.name)}</b><br><span class="muted">${esc(m.why)}</span></li>`).join('')}</ul>
    </details>

    <details class="card">
      <summary><b>Lộ trình</b></summary>
      <ul class="roadmap">${ROADMAP.map((r) => `<li><b>${esc(r.days)}: ${esc(r.focus)}</b><br><span class="muted">${esc(r.detail)}</span></li>`).join('')}</ul>
      <p class="muted small">Mỗi ngày 1 bài. Bài nào chưa tự tin thì học lại; flashcard sẽ tự nhắc ôn đúng lúc.</p>
    </details>
  `;
}

export function renderReflect(el) {
  const day = getDay();
  const lesson = todayLesson();
  el.innerHTML = `
    <a class="back" href="#/today">‹ Hôm nay</a>
    <h1>Viết tổng kết (5 phút)</h1>
    <p class="muted">Viết 3 câu tiếng Anh như đang báo cáo standup với mentor: hôm nay bạn đã học/làm gì, ngày mai làm gì, có vướng mắc gì không. Thử dùng cụm câu của bài “${esc(lesson.titleEn)}”.</p>
    <div class="hint">Gợi ý: <i>Today, I learned how to… Tomorrow, I am going to… I am not sure about…</i></div>
    <textarea id="reflect" rows="6" placeholder="Today, I...">${esc(day.reflect || '')}</textarea>
    <div class="row">
      <button class="btn" id="saveReflect">Lưu & hoàn thành</button>
      ${hasKey() ? '<button class="btn ghost" id="aiCorrect">AI sửa bài</button>' : ''}
      <span class="spacer"></span>${micBtn('', { free: true })}
    </div>
    <div id="aiOut" class="ai-out"></div>
    ${hasKey() ? '' : '<p class="muted small">Muốn AI sửa lỗi bài viết? Thêm API key (Claude, ChatGPT, Gemini…) trong <a href="#/settings">Cài đặt</a>.</p>'}
  `;
  const ta = el.querySelector('#reflect');
  el.addEventListener('spoken', (e) => {
    if (e.detail) ta.value = (ta.value ? ta.value.trim() + ' ' : '') + e.detail;
  });
  el.querySelector('#saveReflect').onclick = () => {
    day.reflect = ta.value.trim();
    if (!day.reflect) return toast('Hãy viết ít nhất một câu nhé.');
    markStep('reflect');
    toast('Đã lưu. Tuyệt vời!');
    location.hash = '#/today';
  };
  const ai = el.querySelector('#aiCorrect');
  if (ai) {
    ai.onclick = async () => {
      const text = ta.value.trim();
      if (!text) return toast('Hãy viết gì đó trước nhé.');
      day.reflect = text;
      save();
      const out = el.querySelector('#aiOut');
      out.textContent = 'Đang sửa…';
      ai.disabled = true;
      try {
        await correctWriting(text, (t) => (out.textContent = t));
      } catch (err) {
        out.innerHTML = `<span class="err">${esc(err.message)}</span>`;
      } finally {
        ai.disabled = false;
      }
    };
  }
}
