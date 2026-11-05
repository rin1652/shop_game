import { dueCards, cardContent, gradeCard, intervalPreview, cardStats } from '../../application/review.js';
import { completeStep } from '../../application/progress.js';
import { GRADE } from '../../domain/scheduling.js';
import { speak } from '../../infrastructure/speech.js';
import { esc, icon, speakBtns, micBtn, page, celebrate } from '../components.js';

const GRADES = [
  { g: GRADE.AGAIN, label: 'Quên', cls: 'bad' },
  { g: GRADE.HARD, label: 'Khó', cls: 'ok' },
  { g: GRADE.GOOD, label: 'Được', cls: 'good' },
  { g: GRADE.EASY, label: 'Dễ', cls: 'easy' },
];

const HINT = {
  produce: 'Nói to câu tiếng Anh trước khi lật thẻ.',
  listen: 'Nghe mentor nói (nghe lại bao nhiêu lần cũng được). Bạn hiểu mentor muốn gì? Rồi mới lật thẻ.',
  recognize: 'Nghĩa là gì? Thử đặt một câu với nó.',
};

export function renderReview(el) {
  let reviewed = 0;
  const show = () => {
    const queue = dueCards();
    const stats = cardStats();
    if (!queue.length) {
      const r = completeStep('review');
      el.innerHTML = `
        ${page({ title: 'Ôn tập' })}
        <div class="card empty center">
          <div class="big-ic">${icon('check', 34)}</div>
          <h2>${reviewed ? `Xong! Bạn đã ôn ${reviewed} thẻ.` : stats.total ? 'Hôm nay không còn thẻ nào đến hạn.' : 'Chưa có thẻ nào.'}</h2>
          <p class="secondary">${stats.total ? `Tổng ${stats.total} thẻ · ${stats.mature} thẻ đã nhớ lâu (≥ 21 ngày).` : 'Học phần “Cụm câu” của một bài, hoặc thêm từ trong Từ điển, để có thẻ ôn tập.'}</p>
          <a class="btn filled" href="#/today" style="margin-top:10px">Về buổi học hôm nay</a>
        </div>`;
      if (r.dayCompleted) celebrate('Xong buổi học hôm nay!', 'Bạn đã hoàn thành cả 5 bước. Hẹn gặp lại ngày mai.');
      return;
    }
    const card = queue[0];
    const c = cardContent(card.id);
    const voice = c.mentorVoice ? 'mentor' : 'me';
    el.innerHTML = `
      ${page({ title: 'Ôn tập', subtitle: `<span class="chip tint" data-left>${queue.length} còn lại</span>` })}
      <div class="card flash">
        <div class="eyebrow">${esc(c.tag)}</div>
        ${c.mode === 'listen' ? `<div class="ctrl" style="margin-top:16px">${speakBtns(c.speak, 'mentor')}</div>` : `<div class="front">${esc(c.front)}</div>`}
        <p class="footnote">${HINT[c.mode]}</p>
        ${c.mode === 'produce' ? `<div class="ctrl">${micBtn(c.back)}</div>` : ''}
        <div class="answer" hidden>
          <div class="back">${esc(c.back)}</div>
          ${c.example ? `<div class="example">“${esc(c.example)}”</div>` : ''}
          <div class="ctrl">${speakBtns(c.speak, voice)}</div>
        </div>
        <button class="btn filled block" id="flip" style="margin-top:16px">Lật thẻ</button>
        <div class="grades" hidden>
          ${GRADES.map((x) => `<button class="grade ${x.cls}" data-g="${x.g}">${x.label}<small>${intervalPreview(card.id, x.g)}</small></button>`).join('')}
        </div>
      </div>
      <p class="section-footer">Chấm thật lòng: “Quên” sẽ cho thẻ quay lại ngay hôm nay, “Dễ” sẽ giãn lịch ôn ra xa hơn.</p>`;
    el.querySelector('#flip').onclick = () => {
      el.querySelector('.answer').hidden = false;
      el.querySelector('.grades').hidden = false;
      el.querySelector('#flip').hidden = true;
      if (c.mode !== 'listen') speak(c.speak, { kind: voice });
    };
    if (c.mode === 'listen') speak(c.speak, { kind: 'mentor' });
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
