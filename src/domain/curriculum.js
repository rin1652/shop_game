// Nội dung học & quy tắc lộ trình. Hàm thuần trên dữ liệu tĩnh.
import { LESSONS, lessonById } from '../data/lessons.js';
import { QA_VOCAB, INDIAN_ENGLISH, AI_TEST_VOCAB } from '../data/glossary.js';
import { ROUTES } from '../data/plan.js';

export { LESSONS, lessonById, ROUTES };

export const DEFAULT_ROUTE = 'fast';
export const LESSON_PARTS = ['listen', 'phrases', 'roleplay'];
export const lessonNumber = (lesson) => LESSONS.indexOf(lesson) + 1;

export const routeOf = (id) => ROUTES[id] || ROUTES[DEFAULT_ROUTE];

// Bài hôm nay: bài đầu tiên chưa xong trong lộ trình → bài chưa xong bất kỳ → bài ôn lâu nhất chưa học lại.
export function pickLesson(routeId, lessonDone) {
  const order = routeOf(routeId).lessons.map(lessonById).filter(Boolean);
  const next = order.find((l) => !lessonDone[l.id]) || LESSONS.find((l) => !lessonDone[l.id]);
  if (next) return next;
  return [...order].sort((a, b) => (lessonDone[a.id] < lessonDone[b.id] ? -1 : 1))[0];
}

export const isLessonComplete = (parts = {}) => LESSON_PARTS.every((k) => parts[k]);

// ---- Thẻ ôn tập ----
// id: p:<bài>:<i> cụm câu | d:<bài>:<i> câu mentor (luyện nghe) | v:<i> từ QA | i:<i> tiếng Anh kiểu Ấn | a:<i> thuật ngữ AI testing
const GLOSSARIES = {
  v: { list: QA_VOCAB, tag: 'QA vocabulary' },
  i: { list: INDIAN_ENGLISH, tag: 'Indian English', mentorVoice: true, speakExample: true },
  a: { list: AI_TEST_VOCAB, tag: 'AI testing' },
};

export function cardContent(id) {
  const [kind, a, b] = String(id).split(':');
  if (kind === 'p') {
    const lesson = lessonById(a);
    const p = lesson?.phrases[Number(b)];
    return p ? { kind, front: p.vi, back: p.en, speak: p.en, mode: 'produce', tag: lesson.titleEn } : null;
  }
  if (kind === 'd') {
    const line = lessonById(a)?.dialogue[Number(b)];
    return line && line.s === 'M' ? { kind, front: '', back: line.en, example: line.vi, speak: line.en, mode: 'listen', tag: 'Luyện nghe mentor', mentorVoice: true } : null;
  }
  const g = GLOSSARIES[kind];
  const v = g?.list[Number(a)];
  if (!v) return null;
  return { kind, front: v.en, back: v.vi, example: v.ex, speak: g.speakExample ? v.ex : v.en, mode: 'recognize', tag: g.tag, mentorVoice: Boolean(g.mentorVoice) };
}

export const phraseCardIds = (lessonId) => (lessonById(lessonId)?.phrases || []).map((_, i) => `p:${lessonId}:${i}`);
export const listeningCardIds = (lessonId) =>
  (lessonById(lessonId)?.dialogue || []).flatMap((line, i) => (line.s === 'M' ? [`d:${lessonId}:${i}`] : []));
export const glossaryCardId = (glossary, index) => `${glossary}:${index}`;
export const GLOSSARY_LISTS = { qa: { prefix: 'v', list: QA_VOCAB }, indian: { prefix: 'i', list: INDIAN_ENGLISH }, ai: { prefix: 'a', list: AI_TEST_VOCAB } };
