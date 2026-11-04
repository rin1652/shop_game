// Ôn tập ngắt quãng (biến thể đơn giản của SM-2).
import { getState, save, todayKey, addDays } from './storage.js';
import { LESSONS } from '../data/lessons.js';
import { QA_VOCAB, INDIAN_ENGLISH } from '../data/glossary.js';

// id thẻ: p:<lessonId>:<index> | v:<index> | i:<index>
export function cardContent(id) {
  const [kind, a, b] = id.split(':');
  if (kind === 'p') {
    const lesson = LESSONS.find((l) => l.id === a);
    const p = lesson?.phrases[Number(b)];
    return p && { kind, front: p.vi, back: p.en, speak: p.en, mode: 'produce', tag: lesson.titleEn };
  }
  if (kind === 'd') {
    // Thẻ luyện nghe: chỉ phát giọng mentor, lật thẻ mới thấy chữ.
    const lesson = LESSONS.find((l) => l.id === a);
    const line = lesson?.dialogue[Number(b)];
    return line && { kind, front: '', back: line.en, example: line.vi, speak: line.en, mode: 'listen', tag: 'Luyện nghe mentor', mentorVoice: true };
  }
  if (kind === 'v') {
    const v = QA_VOCAB[Number(a)];
    return v && { kind, front: v.en, back: v.vi, example: v.ex, speak: v.en, mode: 'recognize', tag: 'QA vocabulary' };
  }
  if (kind === 'i') {
    const v = INDIAN_ENGLISH[Number(a)];
    return v && { kind, front: v.en, back: v.vi, example: v.ex, speak: v.ex, mode: 'recognize', tag: 'Indian English', mentorVoice: true };
  }
  return null;
}

export function hasCard(id) {
  return Boolean(getState().cards[id]);
}

export function addCard(id) {
  const s = getState();
  if (s.cards[id] || !cardContent(id)) return false;
  s.cards[id] = { id, due: todayKey(), interval: 0, ease: 2.5, reps: 0, lapses: 0, added: todayKey() };
  save();
  return true;
}

export function addLessonCards(lessonId) {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return 0;
  let n = 0;
  lesson.phrases.forEach((_, i) => {
    if (addCard(`p:${lessonId}:${i}`)) n++;
  });
  return n;
}

export function addListeningCards(lessonId) {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return 0;
  let n = 0;
  lesson.dialogue.forEach((line, i) => {
    if (line.s === 'M' && addCard(`d:${lessonId}:${i}`)) n++;
  });
  return n;
}

export function dueCards() {
  const today = todayKey();
  return Object.values(getState().cards)
    .filter((c) => c.due <= today && cardContent(c.id))
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.reps - b.reps));
}

export function cardStats() {
  const cards = Object.values(getState().cards);
  const today = todayKey();
  return {
    total: cards.length,
    due: cards.filter((c) => c.due <= today).length,
    mature: cards.filter((c) => c.interval >= 21).length,
  };
}

// grade: 0 = Quên, 1 = Khó, 2 = Được, 3 = Dễ
export function gradeCard(id, grade) {
  const s = getState();
  const c = s.cards[id];
  if (!c) return;
  const today = todayKey();
  if (grade === 0) {
    c.reps = 0;
    c.lapses += 1;
    c.interval = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.due = today; // ôn lại ngay trong hôm nay
  } else {
    if (c.reps === 0) c.interval = grade === 3 ? 3 : 1;
    else if (c.reps === 1) c.interval = grade === 1 ? 2 : grade === 2 ? 3 : 6;
    else c.interval = Math.max(c.interval + 1, Math.round(c.interval * c.ease * (grade === 1 ? 0.6 : grade === 3 ? 1.3 : 1)));
    if (grade === 1) c.ease = Math.max(1.3, c.ease - 0.15);
    if (grade === 3) c.ease += 0.15;
    c.reps += 1;
    c.due = addDays(today, c.interval);
  }
  c.last = today;
  save();
}

export function intervalPreview(id, grade) {
  const c = getState().cards[id];
  if (!c) return '';
  if (grade === 0) return 'ngay';
  let iv;
  if (c.reps === 0) iv = grade === 3 ? 3 : 1;
  else if (c.reps === 1) iv = grade === 1 ? 2 : grade === 2 ? 3 : 6;
  else iv = Math.max(c.interval + 1, Math.round(c.interval * c.ease * (grade === 1 ? 0.6 : grade === 3 ? 1.3 : 1)));
  return iv >= 30 ? `${Math.round(iv / 30)} th` : `${iv} ng`;
}
