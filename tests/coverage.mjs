// Đo độ bao phủ: lộ trình (các bài đã chọn + từ điển) dạy được bao nhiêu phần của bài kiểm tra
// về nền tảng Chunk → RAG → Self-healing. Chạy: node tests/coverage.mjs [all|route]
import { LESSONS } from '../src/data/lessons.js';
import { QA_VOCAB, INDIAN_ENGLISH } from '../src/data/glossary.js';
import * as glossary from '../src/data/glossary.js';
import * as plan from '../src/data/plan.js';
import { PLATFORM_EXAM, PLATFORM_TERMS, FUNCTIONS } from '../src/data/exam.js';

// ~180 từ rất cơ bản người mới (A1–A2) thường đã biết — không tính vào độ khó.
const BASIC = new Set(`a an the and or but if so to of in on at by for with from up out about into over after before than then
is are was were be been am do does did done have has had will would can could should may might must shall
i you he she it we they me him her us them my your our their this that these those there here what which who how why when where
not no yes ok okay please sorry thanks thank hi hello sure right good bad new old more most less very too also only just all any some
one two three four five six seven eight nine ten first second third last next other same each every many much few
make get go come see look find use give take tell say ask know think want need try work fix check send share help start finish
day week today tomorrow yesterday time now friday thursday monday minute hour page button text test tests problem name like let
as its it's i'm don't can't is it's what's that's let's`.split(/\s+/));

const words = (s) => (s.toLowerCase().replace(/[’']/g, "'").match(/[a-z][a-z0-9'-]*/g) || []);
const stem = (w) => w.replace(/'s$/, '').replace(/(ing|ed|es|s)$/, '');

function corpusFor(lessons, extraGlossary = []) {
  const parts = [];
  for (const l of lessons) {
    for (const p of l.phrases) parts.push(p.en);
    for (const d of l.dialogue) parts.push(d.en);
    for (const r of l.roleplay) parts.push(r.mentor, r.sample);
  }
  for (const v of [...QA_VOCAB, ...INDIAN_ENGLISH, ...extraGlossary]) parts.push(v.en, v.ex);
  const text = parts.join(' \n ').toLowerCase();
  return { text, stems: new Set(words(text).map(stem)) };
}

export function measure(lessons, label) {
  const extra = glossary.AI_TEST_VOCAB || [];
  const { text, stems } = corpusFor(lessons, extra);
  const terms = PLATFORM_TERMS.map((t) => [t, text.includes(t)]);
  const termCov = terms.filter(([, ok]) => ok).length / terms.length;

  let total = 0;
  let known = 0;
  const unknown = new Map();
  for (const q of PLATFORM_EXAM) {
    for (const w of words(q.mentor + ' ' + q.sample)) {
      if (BASIC.has(w) || /^\d/.test(w)) continue;
      total++;
      if (stems.has(stem(w))) known++;
      else unknown.set(w, (unknown.get(w) || 0) + 1);
    }
  }
  const tokCov = known / total;

  // Câu mẫu của bài thi "học được" nếu ≥ 90% từ (ngoài từ cơ bản) đã có trong lộ trình.
  const sentenceReady = PLATFORM_EXAM.map((q) => {
    const ws = words(q.sample).filter((w) => !BASIC.has(w) && !/^\d/.test(w));
    const ok = ws.filter((w) => stems.has(stem(w))).length;
    return ws.length ? ok / ws.length : 1;
  });
  const ready = sentenceReady.filter((r) => r >= 0.9).length;

  const fnLessons = { explain: ['l15', 'l19', 'l20'], report: ['l03', 'l12', 'l16', 'l20'], clarify: ['l01', 'l04', 'l05'], pushback: ['l08', 'l09', 'l17'], propose: ['l09', 'l18'], estimate: ['l10'] };
  const ids = new Set(lessons.map((l) => l.id));
  const fns = Object.entries(FUNCTIONS).map(([k, v]) => [v, fnLessons[k].some((id) => ids.has(id))]);

  return { label, termCov, tokCov, ready, total: PLATFORM_EXAM.length, terms, fns, unknown: [...unknown.entries()].sort((a, b) => b[1] - a[1]) };
}

export function print(r) {
  const pct = (x) => Math.round(x * 100) + '%';
  console.log(`\n=== ${r.label} ===`);
  console.log(`Thuật ngữ nền tảng có trong lộ trình : ${pct(r.termCov)}  (${r.terms.filter(([, o]) => o).length}/${r.terms.length})`);
  console.log(`Từ (ngoài từ cơ bản) trong bài thi   : ${pct(r.tokCov)} đã gặp khi học`);
  console.log(`Câu trả lời mẫu nói được bằng từ đã học: ${r.ready}/${r.total}`);
  console.log('Chức năng giao tiếp:', r.fns.map(([n, ok]) => `${ok ? '✓' : '✗'} ${n}`).join(' · '));
  console.log('Thuật ngữ còn thiếu:', r.terms.filter(([, o]) => !o).map(([t]) => t).join(', ') || '(không)');
  console.log('Từ chưa gặp nhiều nhất:', r.unknown.slice(0, 25).map(([w, n]) => `${w}×${n}`).join(' '));
}

const mode = process.argv[2] || 'all';
if (import.meta.url === `file://${process.argv[1]}`) {
  if (mode === 'all') print(measure(LESSONS, 'Toàn bộ ' + LESSONS.length + ' bài'));
  const route = plan.ROUTES?.fast?.lessons;
  if (route) print(measure(route.map((id) => LESSONS.find((l) => l.id === id)), 'Lộ trình nhanh 2 tuần (' + route.length + ' bài)'));
}
