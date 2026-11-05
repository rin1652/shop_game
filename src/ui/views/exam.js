import { PLATFORM_EXAM, FUNCTIONS } from '../../data/exam.js';
import { state, persist } from '../../application/ports.js';
import { hasAI } from '../../application/coach.js';
import { esc, icon, page, speakBtns, micBtn, progressBar } from '../components.js';
import { answerBox, bindAnswerGrading } from './lessons.js';

const TOPICS = { healing: 'Self-healing', rag: 'RAG', chunk: 'Chunking & pipeline' };

const results = () => (state().exam ||= {});

export function renderExam(el) {
  const res = results();
  const passed = PLATFORM_EXAM.filter((_, i) => res[i]?.passed).length;
  const tried = PLATFORM_EXAM.filter((_, i) => res[i]).length;
  el.innerHTML = `
    ${page({ title: 'Bài kiểm tra', back: { href: '#/today', label: 'Hôm nay' }, subtitle: 'Nền tảng Chunk → RAG → Self-healing' })}
    <div class="card">
      <div class="eyebrow">Kết quả</div>
      <h2 data-exam-score>${passed}/${PLATFORM_EXAM.length} câu đạt</h2>
      ${progressBar(passed / PLATFORM_EXAM.length)}
      <p class="secondary" style="margin-top:8px">${tried}/${PLATFORM_EXAM.length} câu đã trả lời. Mục tiêu: đạt ≥ 16/20 (80%) trước khi làm việc thật với mentor.</p>
      ${hasAI() ? '' : '<p class="footnote">Không có API key: chỉ câu trả lời gần giống câu mẫu mới được tính là đạt. Thêm key để AI chấm câu trả lời theo ý của bạn.</p>'}
    </div>
    <div class="hint"><b>Cách làm:</b> nghe mentor (giọng Ấn), đọc nhiệm vụ, trả lời bằng lời của bạn. Đừng xem câu mẫu trước khi trả lời.</div>
    ${Object.entries(TOPICS)
      .map(
        ([topic, name]) => `<div class="section-header">${esc(name)}</div>
      ${PLATFORM_EXAM.map((q, i) => (q.topic !== topic ? '' : examCard(q, i, res[i]))).join('')}`,
      )
      .join('')}
  `;
  bindAnswerGrading(
    el,
    (i) => ({ prompt: PLATFORM_EXAM[i].mentor, task: PLATFORM_EXAM[i].task, sample: PLATFORM_EXAM[i].sample }),
    (i, ok) => {
      const r = results();
      r[i] = { passed: Boolean(r[i]?.passed || ok), at: Date.now() };
      persist();
      const passedNow = PLATFORM_EXAM.filter((_, k) => r[k]?.passed).length;
      el.querySelector('[data-exam-score]').textContent = `${passedNow}/${PLATFORM_EXAM.length} câu đạt`;
      el.querySelector(`[data-rp="${i}"] .chip`)?.replaceWith(statusChip(r[i]));
    },
  );
}

const statusChip = (r) => {
  const span = document.createElement('span');
  span.className = 'chip ' + (r.passed ? 'green' : '');
  span.textContent = r.passed ? 'Đạt' : 'Chưa đạt';
  return span;
};

function examCard(q, i, r) {
  return `<div class="card roleplay" data-rp="${i}">
    <div class="term-head"><span class="eyebrow">Câu ${i + 1} · ${esc(FUNCTIONS[q.fn])}</span>${r ? `<span class="chip ${r.passed ? 'green' : ''}">${r.passed ? 'Đạt' : 'Chưa đạt'}</span>` : '<span class="chip">Chưa làm</span>'}</div>
    <div class="bubble them" style="max-width:100%;margin-top:8px"><div class="who">Rahul · mentor</div><div class="en">${esc(q.mentor)}</div>
      <div class="ctrl">${speakBtns(q.mentor, 'mentor')}</div></div>
    <div class="task">${icon('target', 18)}<span>${esc(q.task)}</span></div>
    ${answerBox(i)}
    <details><summary>Xem câu mẫu</summary><div class="en sample">${esc(q.sample)}</div><div class="ctrl">${speakBtns(q.sample)}${micBtn(q.sample)}</div></details>
  </div>`;
}
