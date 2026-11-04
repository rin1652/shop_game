import { LESSONS, lessonById } from '../data/lessons.js';
import { getState, getDay, save } from '../lib/storage.js';
import { addLessonCards, addListeningCards } from '../lib/srs.js';
import { speak, stopSpeaking, hasIndianVoice } from '../lib/speech.js';
import { hasKey } from '../lib/ai.js';
import { esc, icon, toast, speakBtn, micBtn, renderScore } from '../lib/ui.js';
import { markStep, todayLesson } from './today.js';

export function renderLessonList(el) {
  const s = getState();
  const today = todayLesson();
  const weeks = [...new Set(LESSONS.map((l) => l.week))];
  el.innerHTML = `
    <h1>Bài học</h1>
    <p class="muted">Mỗi bài gồm hội thoại để nghe & nhại, 8 cụm câu cốt lõi, và 3 tình huống nhập vai.</p>
    ${weeks
      .map(
        (w) => `
      <h3 class="week">Chặng ${w}</h3>
      <div class="list">
        ${LESSONS.filter((l) => l.week === w)
          .map((l) => {
            const ls = s.lessonSteps?.[l.id] || {};
            const n = ['listen', 'phrases', 'roleplay'].filter((k) => ls[k]).length;
            return `<a class="item ${s.lessonDone[l.id] ? 'done' : ''}" href="#/lesson/${l.id}/dialogue">
              <span class="num">${s.lessonDone[l.id] ? icon('check', 16) : LESSONS.indexOf(l) + 1}</span>
              <span class="body"><b>${esc(l.title)}</b><small>${esc(l.titleEn)} · ${n}/3 phần${l.id === today.id ? ' · <em>Hôm nay</em>' : ''}</small></span>
            </a>`;
          })
          .join('')}
      </div>`,
      )
      .join('')}
    <p class="muted small">Muốn học bài khác hôm nay? Mở bài đó và bấm “Học bài này hôm nay”.</p>
  `;
}

const TABS = [
  { id: 'dialogue', label: 'Nghe & nhại' },
  { id: 'phrases', label: 'Cụm câu' },
  { id: 'roleplay', label: 'Nhập vai' },
];

export function renderLesson(el, id, tab = 'dialogue') {
  const lesson = lessonById(id);
  if (!lesson) {
    el.innerHTML = '<p>Không tìm thấy bài học.</p>';
    return;
  }
  const s = getState();
  const isToday = getDay().lessonId === id;
  const ls = s.lessonSteps?.[id] || {};
  const stepKey = { dialogue: 'listen', phrases: 'phrases', roleplay: 'roleplay' };

  el.innerHTML = `
    <a class="back" href="#/lessons">‹ Bài học</a>
    <div class="tag">Bài ${LESSONS.indexOf(lesson) + 1} · Chặng ${lesson.week}</div>
    <h1>${esc(lesson.title)}</h1>
    <p class="muted">${esc(lesson.goal)}</p>
    ${isToday ? '' : '<button class="btn ghost small" id="makeToday">Học bài này hôm nay</button>'}
    <nav class="tabs">${TABS.map(
      (t) => `<a href="#/lesson/${id}/${t.id}" class="${t.id === tab ? 'active' : ''}">${ls[stepKey[t.id]] ? '✓ ' : ''}${t.label}</a>`,
    ).join('')}</nav>
    <div id="tab"></div>
  `;
  el.querySelector('#makeToday')?.addEventListener('click', () => {
    getDay().lessonId = id;
    save();
    toast('Đã chọn làm bài hôm nay.');
    renderLesson(el, id, tab);
  });
  const box = el.querySelector('#tab');
  if (tab === 'phrases') renderPhrases(box, lesson);
  else if (tab === 'roleplay') renderRoleplay(box, lesson);
  else renderDialogue(box, lesson);
}

function finishBtn(label = 'Xong phần này') {
  return `<button class="btn block" id="finish">${icon('check', 18)} ${label}</button>`;
}

function onFinish(box, lesson, key, next) {
  box.querySelector('#finish').onclick = () => {
    markStep(key, lesson.id);
    if (key === 'phrases' || key === 'listen') {
      const n = key === 'phrases' ? addLessonCards(lesson.id) : addListeningCards(lesson.id);
      toast(n ? `Đã thêm ${n} thẻ ${key === 'listen' ? 'luyện nghe' : 'cụm câu'} vào flashcard.` : 'Đã hoàn thành.');
    } else toast('Đã hoàn thành!');
    location.hash = next;
  };
}

function renderDialogue(box, lesson) {
  const voiceNote = hasIndianVoice()
    ? 'Lời mentor được đọc bằng giọng tiếng Anh Ấn Độ.'
    : 'Máy bạn chưa có giọng tiếng Anh Ấn Độ (en-IN), app dùng giọng khác. Xem hướng dẫn cài giọng trong Cài đặt.';
  box.innerHTML = `
    <div class="hint">
      <b>Cách học (15 phút):</b> 1) Bấm “Phát cả bài”, nghe không nhìn tiếng Việt. 2) Nghe lại ở tốc độ chậm, bật nghĩa. 3) Nhại từng câu: nghe, rồi bấm micro và nói theo ngay. 4) Khi đã quen bài, bật “Nghe chép”: chữ của mentor bị ẩn, bạn gõ lại những gì nghe được rồi bấm Kiểm tra.
      <div class="muted small">${voiceNote}</div>
    </div>
    <div class="row">
      <button class="btn" id="playAll">${icon('play', 18)} Phát cả bài</button>
      <button class="btn ghost" id="playSlow">${icon('slow', 18)} Chậm</button>
      <button class="btn ghost" id="stop">Dừng</button>
      <label class="toggle"><input type="checkbox" id="showVi"> Hiện nghĩa</label>
      <label class="toggle"><input type="checkbox" id="dictation"> Nghe chép (ẩn chữ mentor)</label>
    </div>
    <div class="dialogue hide-vi">
      ${lesson.dialogue
        .map(
          (line, i) => `
        <div class="line ${line.s === 'M' ? 'mentor' : 'me'}" data-i="${i}">
          <div class="who">${line.s === 'M' ? 'Rahul (mentor)' : 'Bạn'}</div>
          <div class="en">${esc(line.en)}</div>
          <div class="vi">${esc(line.vi)}</div>
          ${
            line.s === 'M'
              ? `<div class="dict"><input type="text" placeholder="Gõ lại những gì bạn nghe được…" autocomplete="off" autocapitalize="off"><button class="btn small" data-check="${i}">Kiểm tra</button><div class="dict-out"></div></div>`
              : ''
          }
          <div class="ctrl">${speakBtn(line.en, line.s === 'M' ? 'mentor' : 'me')}${micBtn(line.en)}</div>
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
    dlg.querySelectorAll('.line.revealed').forEach((n) => n.classList.remove('revealed'));
  };
  dlg.querySelectorAll('[data-check]').forEach((b) => {
    b.onclick = () => {
      const line = lesson.dialogue[Number(b.dataset.check)];
      const node = b.closest('.line');
      const typed = node.querySelector('.dict input').value.trim();
      node.querySelector('.dict-out').innerHTML = renderScore(line.en, typed, 'Bạn gõ');
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
    <div class="hint"><b>Cách học (15 phút):</b> Đọc nghĩa tiếng Việt, che câu tiếng Anh và thử tự nói. Rồi nghe mẫu và bấm micro nói lại đến khi đạt ≥ 80%. Từ màu đỏ là từ máy chưa nghe ra.</div>
    <div class="phrases">
      ${lesson.phrases
        .map(
          (p) => `
        <div class="card phrase">
          <div class="vi">${esc(p.vi)}</div>
          <div class="en">${esc(p.en)}</div>
          <div class="ctrl">${speakBtn(p.en)}${micBtn(p.en)}</div>
        </div>`,
        )
        .join('')}
    </div>
    ${finishBtn('Xong & thêm vào flashcard')}
  `;
  onFinish(box, lesson, 'phrases', `#/lesson/${lesson.id}/roleplay`);
}

function renderRoleplay(box, lesson) {
  box.innerHTML = `
    <div class="hint"><b>Cách học (15 phút):</b> Nghe mentor nói, đọc nhiệm vụ, rồi bấm micro và TRẢ LỜI BẰNG LỜI CỦA BẠN. Sau đó mới xem câu mẫu để so sánh. Không cần giống y hệt, chỉ cần rõ ý.</div>
    ${['l08', 'l09', 'l10', 'l11'].includes(lesson.id) ? '<div class="hint"><b>Công thức phản biện 4 bước:</b> 1) Ghi nhận: <i>I see your point…</i> 2) Nêu lo ngại + bằng chứng: <i>but I have a concern, because…</i> 3) Đề xuất: <i>May I suggest…?</i> 4) Hỏi ý kiến: <i>What do you think?</i></div>' : ''}
    ${
      hasKey()
        ? `<a class="btn block ghost" href="#/chat?lesson=${lesson.id}">Luyện thêm với AI mentor theo chủ đề này ›</a>`
        : '<p class="muted small">Có Claude API key? Thêm trong <a href="#/settings">Cài đặt</a> để luyện hội thoại tự do với AI mentor.</p>'
    }
    ${lesson.roleplay
      .map(
        (r, i) => `
      <div class="card roleplay">
        <div class="line mentor"><div class="who">Rahul (mentor)</div><div class="en">${esc(r.mentor)}</div>
          <div class="ctrl">${speakBtn(r.mentor, 'mentor')}</div></div>
        <div class="task">🎯 ${esc(r.task)}</div>
        <div class="ctrl">${micBtn('', { free: true })}</div>
        <p class="muted small">Tự chấm: ✓ trả lời đúng nhiệm vụ · ✓ câu đầy đủ chủ ngữ + động từ · ✓ lịch sự (could / please / I think).</p>
        <details><summary>Xem câu mẫu</summary>
          <div class="en sample">${esc(r.sample)}</div>
          <div class="ctrl">${speakBtn(r.sample)}${micBtn(r.sample)}</div>
        </details>
      </div>`,
      )
      .join('')}
    ${finishBtn('Xong phần nhập vai')}
  `;
  onFinish(box, lesson, 'roleplay', '#/today');
}
