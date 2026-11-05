import { todayLesson, todaySummary, currentRoute, routeId, setRoute, completeStep, getDay, saveReflection } from '../../application/progress.js';
import { cardStats } from '../../application/review.js';
import { hasAI, correctWriting } from '../../application/coach.js';
import { lessonNumber, ROUTES } from '../../domain/curriculum.js';
import { METHODS } from '../../data/plan.js';
import { esc, icon, toast, micBtn, page, rings, progressBar, celebrate } from '../components.js';

const STEP_ICON = { review: ['cards', 'indigo'], listen: ['ear', 'orange'], phrases: ['mic', ''], roleplay: ['target', 'pink'], reflect: ['pencil', 'green'] };

const stepHref = (step, lesson) => (step.route.startsWith('lesson:') ? `#/lesson/${lesson.id}/${step.route.split(':')[1]}` : step.route);

const dateLabel = () => new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

export function renderToday(el) {
  const lesson = todayLesson();
  const sum = todaySummary();
  const stats = cardStats();
  const next = sum.steps.find((s) => !s.done);
  const route = currentRoute();

  el.innerHTML = `
    ${page({ title: 'Hôm nay', subtitle: esc(dateLabel()) })}

    <section class="card hero" aria-label="Tiến độ hôm nay">
      ${rings([
        { value: sum.done / sum.total, color: '--ring-1', track: '--ring-1-track' },
        { value: sum.minutes / 60, color: '--ring-2', track: '--ring-2-track' },
      ])}
      <div class="stats">
        <div class="stat s1"><b data-steps>${sum.done}/${sum.total}</b><small>bước hôm nay</small></div>
        <div class="stat s2"><b>${sum.minutes}/60</b><small>phút học</small></div>
        <div class="stat s3"><b data-streak>${sum.streak}</b><small>ngày liên tiếp</small></div>
      </div>
    </section>

    <a class="card lesson-card" href="${next ? stepHref(next, lesson) : `#/lesson/${lesson.id}/dialogue`}">
      <div class="eyebrow" data-lesson-tag>Bài ${lessonNumber(lesson)} · Chặng ${lesson.week}</div>
      <h2 style="margin-top:4px">${esc(lesson.title)}</h2>
      <p class="secondary">${esc(lesson.goal)}</p>
      <span class="btn filled block">${next ? (sum.done ? 'Học tiếp: ' + esc(next.title) : 'Bắt đầu buổi học') : 'Ôn lại bài hôm nay'}</span>
    </a>

    <div class="section-header">Kế hoạch 60 phút</div>
    <div class="group steps">
      ${sum.steps
        .map(
          (st) => `<a class="row has-icon step ${st.done ? 'done' : ''}" href="${stepHref(st, lesson)}">
            <span class="icon-tile ${STEP_ICON[st.key][1]}">${icon(STEP_ICON[st.key][0], 18)}</span>
            <span class="body"><span class="title">${esc(st.title)}${st.key === 'review' && stats.due ? ` <span class="chip tint">${stats.due} thẻ</span>` : ''}</span>
              <span class="sub">${st.min} phút · ${esc(st.desc)}</span></span>
            <span class="check">${icon('check', 16)}</span>
          </a>`,
        )
        .join('')}
    </div>

    <div class="section-header">Lộ trình</div>
    <div class="group">
      <div class="row"><span class="body"><span class="title">${esc(route.label)}</span>
        <span class="sub">${sum.routeDone}/${sum.routeTotal} bài · ${esc(route.desc)}</span>${progressBar(sum.routeDone / sum.routeTotal)}</span></div>
      <div class="row"><span class="body"><span class="sub">Đổi lộ trình</span>
        <nav class="segmented" style="margin:6px 0 0" data-route-picker>${Object.entries(ROUTES)
          .map(([id, r]) => `<a href="#" data-route="${id}" class="${id === routeId() ? 'active' : ''}">${esc(r.label.split(' · ')[0])}</a>`)
          .join('')}</nav></span></div>
      <a class="row has-icon" href="#/exam"><span class="icon-tile indigo">${icon('target', 18)}</span>
        <span class="body"><span class="title">Bài kiểm tra cuối lộ trình</span><span class="sub">20 câu mentor hỏi về Chunk → RAG → Self-healing</span></span>${icon('chevron', 18, 'chev')}</a>
    </div>
    <details class="group" style="margin-top:12px">
      <summary class="row" style="color:var(--label)"><span class="body"><span class="title">Các chặng của lộ trình</span></span>${icon('chevron', 18, 'chev')}</summary>
      ${route.roadmap.map((r) => `<div class="row"><span class="body"><span class="title">${esc(r.days)}: ${esc(r.focus)}</span><span class="sub">${esc(r.detail)}</span></span></div>`).join('')}
    </details>

    <div class="section-header">Vì sao học như thế này?</div>
    <div class="group">
      ${METHODS.map((m) => `<div class="row"><span class="body"><span class="title">${esc(m.name)}</span><span class="sub">${esc(m.why)}</span></span></div>`).join('')}
    </div>
    <p class="section-footer">${sum.lessonsDone}/${sum.lessonsTotal} bài đã học. Bài chưa tự tin thì học lại; flashcard tự nhắc ôn đúng lúc.</p>
  `;

  el.querySelectorAll('[data-route]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setRoute(a.dataset.route);
      toast('Đã đổi lộ trình: ' + ROUTES[a.dataset.route].label);
      renderToday(el);
    }),
  );
}

export function renderReflect(el) {
  const day = getDay();
  const lesson = todayLesson();
  el.innerHTML = `
    ${page({ title: 'Viết tổng kết', back: { href: '#/today', label: 'Hôm nay' } })}
    <p class="secondary">Viết 3 câu tiếng Anh như đang báo cáo standup với mentor: hôm nay bạn đã học/làm gì, ngày mai làm gì, có vướng mắc gì không. Thử dùng cụm câu của bài “${esc(lesson.titleEn)}”.</p>
    <div class="hint">Gợi ý: <i>Today, I learned how to… Tomorrow, I am going to… I am not sure about…</i></div>
    <textarea id="reflect" rows="6" placeholder="Today, I...">${esc(day.reflect || '')}</textarea>
    <div class="ctrl">${micBtn('', { free: true, label: 'Nói thay vì gõ' })}</div>
    <div class="ctrl">
      <button class="btn filled" id="saveReflect">Lưu & hoàn thành</button>
      ${hasAI() ? `<button class="btn" id="aiCorrect">${icon('sparkles', 18)} AI sửa bài</button>` : ''}
    </div>
    <div id="aiOut" class="card ai-out" hidden></div>
    ${hasAI() ? '' : '<p class="footnote">Muốn AI sửa lỗi bài viết? Thêm API key (Claude, ChatGPT, Gemini…) trong <a href="#/settings">Cài đặt</a>.</p>'}
  `;
  const ta = el.querySelector('#reflect');
  el.addEventListener('spoken', (e) => {
    if (e.detail) ta.value = (ta.value ? ta.value.trim() + ' ' : '') + e.detail;
  });
  el.querySelector('#saveReflect').onclick = () => {
    const text = ta.value.trim();
    if (!text) return toast('Hãy viết ít nhất một câu nhé.');
    saveReflection(text);
    const r = completeStep('reflect');
    location.hash = '#/today';
    if (r.dayCompleted) celebrate('Xong buổi học hôm nay!', 'Bạn đã hoàn thành cả 5 bước. Hẹn gặp lại ngày mai.');
    else toast('Đã lưu. Tuyệt vời!');
  };
  const btn = el.querySelector('#aiCorrect');
  if (!btn) return;
  btn.onclick = async () => {
    const out = el.querySelector('#aiOut');
    const text = ta.value.trim();
    saveReflection(text);
    btn.disabled = true;
    out.hidden = false;
    out.textContent = 'Đang sửa…';
    try {
      const r = await correctWriting(text, { onText: (t) => (out.textContent = t) });
      if (r.mode === 'reject') {
        out.hidden = true;
        toast(r.msg);
      } else if (r.mode === 'cached') {
        out.textContent = r.value;
        toast('Bài này đã được sửa trước đó: dùng lại kết quả, không gọi AI.');
      }
    } catch (err) {
      out.innerHTML = `<span class="err">${esc(err.message)}</span>`;
    } finally {
      btn.disabled = false;
    }
  };
}
