import { todayLesson, chooseTodayLesson, getDay, lessonParts, isLessonDone, completeStep } from '../../application/progress.js';
import { addLessonCards, addListeningCards } from '../../application/review.js';
import { hasAI, evaluateAnswer } from '../../application/coach.js';
import { LESSONS, lessonById, lessonNumber } from '../../domain/curriculum.js';
import { speak, stopSpeaking, hasIndianVoice } from '../../infrastructure/speech.js';
import { esc, icon, toast, speakBtns, micBtn, renderScore, page, segmented, celebrate } from '../components.js';

const WEEK_NAMES = { 1: 'Sống sót trong cuộc gọi', 2: 'Hiểu requirement', 3: 'Báo bug & bảo vệ quan điểm', 4: 'Đàm phán công việc', 5: 'Làm việc thật', 6: 'Nền tảng AI testing' };

export function renderLessonList(el) {
  const today = todayLesson();
  const weeks = [...new Set(LESSONS.map((l) => l.week))];
  el.innerHTML = `
    ${page({ title: 'Bài học', subtitle: `${LESSONS.filter((l) => isLessonDone(l.id)).length}/${LESSONS.length} bài đã học` })}
    ${weeks
      .map(
        (w) => `<div class="section-header">Chặng ${w} · ${esc(WEEK_NAMES[w] || '')}</div>
      <div class="group">${LESSONS.filter((l) => l.week === w)
        .map((l) => {
          const n = ['listen', 'phrases', 'roleplay'].filter((k) => lessonParts(l.id)[k]).length;
          const done = isLessonDone(l.id);
          return `<a class="row lesson-row ${done ? 'done' : ''}" href="#/lesson/${l.id}/dialogue">
              <span class="check">${done ? icon('check', 16) : `<small style="color:var(--label-2);font-weight:600">${lessonNumber(l)}</small>`}</span>
              <span class="body"><span class="title">${esc(l.title)}</span><span class="sub">${esc(l.titleEn)} · ${n}/3 phần${l.id === today.id ? ' · <b style="color:var(--tint)">Hôm nay</b>' : ''}</span></span>
              ${icon('chevron', 18, 'chev')}</a>`;
        })
        .join('')}</div>`,
      )
      .join('')}
    <p class="section-footer">Muốn học bài khác hôm nay? Mở bài đó và bấm “Học bài này hôm nay”.</p>
  `;
}

const TABS = [
  { id: 'dialogue', label: 'Nghe & nhại', step: 'listen' },
  { id: 'phrases', label: 'Cụm câu', step: 'phrases' },
  { id: 'roleplay', label: 'Nhập vai', step: 'roleplay' },
];

export function renderLesson(el, id, tab = 'dialogue') {
  const lesson = lessonById(id);
  if (!lesson) {
    el.innerHTML = page({ title: 'Không tìm thấy', back: { href: '#/lessons', label: 'Bài học' } });
    return;
  }
  const parts = lessonParts(id);
  const isToday = getDay().lessonId === id;
  el.innerHTML = `
    ${page({ title: lesson.title, back: { href: '#/lessons', label: 'Bài học' } })}
    <div class="eyebrow" style="margin-top:-4px">Bài ${lessonNumber(lesson)} · Chặng ${lesson.week} · ${esc(lesson.titleEn)}</div>
    <p class="secondary">${esc(lesson.goal)}</p>
    ${isToday ? '' : '<button class="btn small" id="makeToday" style="margin:6px 0">Học bài này hôm nay</button>'}
    ${segmented(
      TABS.map((t) => ({ id: t.id, href: `#/lesson/${id}/${t.id}`, label: (parts[t.step] ? '✓ ' : '') + t.label })),
      TABS.some((t) => t.id === tab) ? tab : 'dialogue',
    )}
    <div id="tab"></div>
  `;
  el.querySelector('#makeToday')?.addEventListener('click', () => {
    chooseTodayLesson(id);
    toast('Đã chọn làm bài hôm nay.');
    renderLesson(el, id, tab);
  });
  const box = el.querySelector('#tab');
  if (tab === 'phrases') renderPhrases(box, lesson);
  else if (tab === 'roleplay') renderRoleplay(box, lesson);
  else renderDialogue(box, lesson);
}

const finishBtn = (label) => `<div class="sticky-cta"><button class="btn filled block" id="finish">${icon('check', 18)} ${label}</button></div>`;

function onFinish(box, lesson, step, next) {
  box.querySelector('#finish').onclick = () => {
    const added = step === 'phrases' ? addLessonCards(lesson.id) : step === 'listen' ? addListeningCards(lesson.id) : 0;
    const r = completeStep(step, lesson.id);
    location.hash = next;
    if (r.dayCompleted) celebrate('Xong buổi học hôm nay!', 'Bạn đã hoàn thành cả 5 bước. Hẹn gặp lại ngày mai.');
    else if (r.lessonCompleted) celebrate(`Xong bài ${lessonNumber(lesson)}!`, `“${lesson.titleEn}” đã hoàn thành. Các câu đã vào flashcard để ôn.`);
    else toast(added ? `Đã thêm ${added} thẻ ${step === 'listen' ? 'luyện nghe' : 'cụm câu'} vào flashcard.` : 'Đã hoàn thành!');
  };
}

function renderDialogue(box, lesson) {
  const voiceNote = hasIndianVoice()
    ? 'Lời mentor được đọc bằng giọng tiếng Anh Ấn Độ.'
    : 'Máy chưa có giọng tiếng Anh Ấn Độ (en-IN), app dùng giọng khác. Cách cài có trong Cài đặt.';
  box.innerHTML = `
    <div class="hint"><b>Cách học · 15 phút.</b> Nghe cả bài không nhìn nghĩa, nghe lại ở tốc độ chậm, rồi nhại từng câu. Khi đã quen, bật “Nghe chép”: chữ của mentor bị ẩn, bạn gõ lại những gì nghe được.
      <div class="footnote" style="margin-top:4px">${voiceNote}</div></div>
    <div class="ctrl">
      <button class="btn filled small" id="playAll">${icon('play', 16)} Phát cả bài</button>
      <button class="btn small" id="playSlow">Chậm</button>
      <button class="btn small" id="stop">${icon('stop', 16)} Dừng</button>
    </div>
    <div class="toggles">
      <label class="toggle-pill"><input type="checkbox" class="switch" id="showVi"> Hiện nghĩa</label>
      <label class="toggle-pill"><input type="checkbox" class="switch" id="dictation"> Nghe chép</label>
    </div>
    <div class="dialogue hide-vi">
      ${lesson.dialogue
        .map(
          (line, i) => `
        <div class="bubble ${line.s === 'M' ? 'them line mentor' : 'me line'}" data-i="${i}">
          <div class="who">${line.s === 'M' ? 'Rahul · mentor' : 'Bạn'}</div>
          <div class="en">${esc(line.en)}</div>
          <div class="vi">${esc(line.vi)}</div>
          ${line.s === 'M' ? `<div class="dict"><input type="text" placeholder="Gõ lại những gì bạn nghe…" autocomplete="off" autocapitalize="off"><button class="btn small filled" data-check="${i}">Kiểm tra</button><div class="dict-out"></div></div>` : ''}
          <div class="ctrl">${speakBtns(line.en, line.s === 'M' ? 'mentor' : 'me')}${micBtn(line.en, { label: 'Nhại' })}</div>
        </div>`,
        )
        .join('')}
    </div>
    ${finishBtn('Xong phần nghe & nhại')}
  `;
  const dlg = box.querySelector('.dialogue');
  box.querySelector('#showVi').onchange = (e) => dlg.classList.toggle('hide-vi', !e.target.checked);
  box.querySelector('#dictation').onchange = (e) => {
    dlg.classList.toggle('dictation', e.target.checked);
    dlg.querySelectorAll('.revealed').forEach((n) => n.classList.remove('revealed'));
  };
  dlg.querySelectorAll('[data-check]').forEach((b) => {
    b.onclick = () => {
      const node = b.closest('.bubble');
      const line = lesson.dialogue[Number(b.dataset.check)];
      node.querySelector('.dict-out').innerHTML = renderScore(line.en, node.querySelector('.dict input').value.trim(), 'Bạn gõ');
      node.classList.add('revealed');
    };
  });
  let playing = false;
  const playAll = async (slow) => {
    stopSpeaking();
    playing = true;
    for (let i = 0; i < lesson.dialogue.length && playing; i++) {
      const line = lesson.dialogue[i];
      const node = dlg.querySelector(`[data-i="${i}"]`);
      node.classList.add('now');
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      await speak(line.en, { kind: line.s === 'M' ? 'mentor' : 'me', slow });
      node.classList.remove('now');
      await new Promise((r) => setTimeout(r, 350));
    }
    playing = false;
  };
  box.querySelector('#playAll').onclick = () => playAll(false);
  box.querySelector('#playSlow').onclick = () => playAll(true);
  box.querySelector('#stop').onclick = () => {
    playing = false;
    stopSpeaking();
  };
  onFinish(box, lesson, 'listen', `#/lesson/${lesson.id}/phrases`);
}

function renderPhrases(box, lesson) {
  box.innerHTML = `
    <div class="hint"><b>Cách học · 15 phút.</b> Đọc nghĩa tiếng Việt, che câu tiếng Anh và thử tự nói. Rồi nghe mẫu và bấm Nói đến khi đạt ≥ 80%. Từ màu đỏ là từ máy chưa nghe ra.</div>
    <div class="phrases">
      ${lesson.phrases
        .map(
          (p) => `<div class="card phrase">
          <div class="vi">${esc(p.vi)}</div>
          <div class="en">${esc(p.en)}</div>
          <div class="ctrl">${speakBtns(p.en)}${micBtn(p.en)}</div>
        </div>`,
        )
        .join('')}
    </div>
    ${finishBtn('Xong & thêm vào flashcard')}
  `;
  onFinish(box, lesson, 'phrases', `#/lesson/${lesson.id}/roleplay`);
}

// Ô trả lời có chấm điểm: dùng chung cho Nhập vai và Bài kiểm tra.
export const answerBox = (i) => `
  <div class="ctrl">${micBtn('', { free: true, label: 'Trả lời bằng giọng nói' })}</div>
  <div class="field-row rp-answer"><input type="text" placeholder="…hoặc gõ câu trả lời" autocomplete="off" autocapitalize="off"><button class="btn small filled" data-eval="${i}">Chấm</button></div>
  <div class="rp-eval" aria-live="polite"></div>`;

// Gắn chấm điểm cho các thẻ [data-rp]. getItem(i) → { prompt, task, sample }. onResult(i, passed).
export function bindAnswerGrading(box, getItem, onResult = () => {}) {
  const evaluate = async (card, answer) => {
    const i = Number(card.dataset.rp);
    const out = card.querySelector('.rp-eval');
    out.innerHTML = '<span class="secondary">Đang chấm…</span>';
    try {
      const r = await evaluateAnswer({ ...getItem(i), answer }, { onText: (t) => (out.innerHTML = `<div class="callout">${esc(t)}</div>`) });
      if (r.mode === 'reject') out.innerHTML = `<span class="secondary">${esc(r.msg)}</span>`;
      else if (r.mode === 'local') out.innerHTML = `<div class="score good">✅ ${esc(r.msg)}</div>`;
      else if (r.mode === 'nokey')
        out.innerHTML = `<span class="secondary">Câu của bạn khác câu mẫu (${r.score}% giống). Mở “Xem câu mẫu” và tự so sánh theo 3 tiêu chí bên dưới. Thêm API key trong Cài đặt để AI chấm câu khác mẫu.</span>`;
      else out.innerHTML = `<div class="callout">${esc(r.text)}</div>`;
      const passed = r.mode === 'local' || ((r.mode === 'ai' || r.mode === 'cached') && /^\s*✅/.test(r.text || ''));
      onResult(i, passed, r);
    } catch (err) {
      out.innerHTML = `<span class="err">${esc(err.message)}</span>`;
    }
  };
  box.addEventListener('spoken', (e) => {
    const card = e.target.closest('[data-rp]');
    if (!card || !e.target.dataset.free) return;
    card.querySelector('.rp-answer input').value = e.detail || '';
    evaluate(card, e.detail || '');
  });
  box.querySelectorAll('[data-eval]').forEach((b) => {
    b.onclick = () => {
      const card = b.closest('[data-rp]');
      evaluate(card, card.querySelector('.rp-answer input').value.trim());
    };
  });
}

function renderRoleplay(box, lesson) {
  const pushback = ['l08', 'l09', 'l10', 'l11', 'l17', 'l18'].includes(lesson.id);
  box.innerHTML = `
    <div class="hint"><b>Cách học · 15 phút.</b> Nghe mentor, đọc nhiệm vụ, rồi TRẢ LỜI BẰNG LỜI CỦA BẠN. Sau đó mới xem câu mẫu. Không cần giống y hệt, chỉ cần rõ ý.</div>
    ${pushback ? '<div class="hint"><b>Công thức phản biện 4 bước:</b> 1) Ghi nhận: <i>I see your point…</i> 2) Nêu lo ngại + bằng chứng: <i>but I have a concern, because…</i> 3) Đề xuất: <i>May I suggest…?</i> 4) Hỏi ý kiến: <i>What do you think?</i></div>' : ''}
    ${
      hasAI()
        ? `<a class="btn block" href="#/chat?lesson=${lesson.id}">${icon('sparkles', 18)} Luyện thêm với AI mentor theo chủ đề này</a>`
        : '<p class="footnote">Có API key AI (Claude, ChatGPT, Gemini…)? Thêm trong <a href="#/settings">Cài đặt</a> để luyện hội thoại tự do với AI mentor.</p>'
    }
    ${lesson.roleplay
      .map(
        (r, i) => `
      <div class="card roleplay" data-rp="${i}">
        <div class="bubble them" style="max-width:100%"><div class="who">Rahul · mentor</div><div class="en">${esc(r.mentor)}</div>
          <div class="ctrl">${speakBtns(r.mentor, 'mentor')}</div></div>
        <div class="task">${icon('target', 18)}<span>${esc(r.task)}</span></div>
        ${answerBox(i)}
        <p class="footnote">Tự chấm: ✓ trả lời đúng nhiệm vụ · ✓ câu đầy đủ chủ ngữ + động từ · ✓ lịch sự (could / please / I think).</p>
        <details><summary>Xem câu mẫu</summary>
          <div class="en sample">${esc(r.sample)}</div>
          <div class="ctrl">${speakBtns(r.sample)}${micBtn(r.sample)}</div>
        </details>
      </div>`,
      )
      .join('')}
    ${finishBtn('Xong phần nhập vai')}
  `;
  bindAnswerGrading(box, (i) => ({ prompt: lesson.roleplay[i].mentor, task: lesson.roleplay[i].task, sample: lesson.roleplay[i].sample }));
  onFinish(box, lesson, 'roleplay', '#/today');
}
