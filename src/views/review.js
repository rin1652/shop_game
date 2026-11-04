import { dueCards, cardContent, gradeCard, intervalPreview, cardStats } from '../lib/srs.js';
import { speak } from '../lib/speech.js';
import { esc, speakBtn, micBtn } from '../lib/ui.js';
import { markStep } from './today.js';

const GRADES = [
  { g: 0, label: 'Quên', cls: 'bad' },
  { g: 1, label: 'Khó', cls: 'ok' },
  { g: 2, label: 'Được', cls: 'good' },
  { g: 3, label: 'Dễ', cls: 'easy' },
];

export function renderReview(el) {
  let reviewed = 0;

  const show = () => {
    const queue = dueCards();
    const stats = cardStats();
    if (!queue.length) {
      if (reviewed > 0 || stats.total > 0) markStep('review');
      el.innerHTML = `
        <h1>Ôn tập</h1>
        <div class="card center">
          <div class="big">🎉</div>
          <p><b>${reviewed ? `Xong! Bạn đã ôn ${reviewed} thẻ.` : stats.total ? 'Hôm nay không còn thẻ nào đến hạn.' : 'Chưa có thẻ nào.'}</b></p>
          <p class="muted">${
            stats.total
              ? `Tổng ${stats.total} thẻ · ${stats.mature} thẻ đã nhớ lâu (≥ 21 ngày).`
              : 'Học phần “Cụm câu” của một bài, hoặc thêm từ trong Từ điển, để có thẻ ôn tập.'
          }</p>
          <a class="btn" href="#/today">Về buổi học hôm nay</a>
        </div>`;
      return;
    }
    const card = queue[0];
    const c = cardContent(card.id);
    const voice = c.mentorVoice ? 'mentor' : 'me';
    el.innerHTML = `
      <h1>Ôn tập <span class="badge">${queue.length} còn lại</span></h1>
      <div class="card flash">
        <div class="tag">${esc(c.tag)}</div>
        <div class="front">${esc(c.front)}</div>
        <p class="muted small">${c.mode === 'produce' ? 'Nói to câu tiếng Anh trước khi lật thẻ.' : 'Nghĩa là gì? Thử đặt một câu với nó.'}</p>
        ${c.mode === 'produce' ? `<div class="ctrl">${micBtn(c.back)}</div>` : ''}
        <div class="answer" hidden>
          <div class="back">${esc(c.back)}</div>
          ${c.example ? `<div class="example">“${esc(c.example)}”</div>` : ''}
          <div class="ctrl">${speakBtn(c.speak, voice)}</div>
        </div>
        <button class="btn block" id="flip">Lật thẻ</button>
        <div class="grades" hidden>
          ${GRADES.map((x) => `<button class="grade ${x.cls}" data-g="${x.g}">${x.label}<small>${intervalPreview(card.id, x.g)}</small></button>`).join('')}
        </div>
      </div>`;
    el.querySelector('#flip').onclick = () => {
      el.querySelector('.answer').hidden = false;
      el.querySelector('.grades').hidden = false;
      el.querySelector('#flip').hidden = true;
      speak(c.speak, { kind: voice });
    };
    el.querySelectorAll('.grade').forEach((b) => {
      b.onclick = () => {
        gradeCard(card.id, Number(b.dataset.g));
        reviewed++;
        show();
      };
    });
  };
  show();
}
