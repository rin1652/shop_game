// Ôn tập ngắt quãng: biến thể đơn giản của SM-2. Hàm thuần: nhận thẻ, trả về thẻ mới.
import { addDays } from './calendar.js';

export const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

export const newCard = (id, today) => ({ id, due: today, interval: 0, ease: 2.5, reps: 0, lapses: 0, added: today });

export function nextInterval(card, grade) {
  if (grade === GRADE.AGAIN) return 0;
  if (card.reps === 0) return grade === GRADE.EASY ? 3 : 1;
  if (card.reps === 1) return grade === GRADE.HARD ? 2 : grade === GRADE.GOOD ? 3 : 6;
  const factor = grade === GRADE.HARD ? 0.6 : grade === GRADE.EASY ? 1.3 : 1;
  return Math.max(card.interval + 1, Math.round(card.interval * card.ease * factor));
}

export function schedule(card, grade, today) {
  const c = { ...card, last: today };
  if (grade === GRADE.AGAIN) {
    return { ...c, reps: 0, lapses: c.lapses + 1, interval: 0, ease: Math.max(1.3, c.ease - 0.2), due: today };
  }
  c.interval = nextInterval(card, grade);
  if (grade === GRADE.HARD) c.ease = Math.max(1.3, c.ease - 0.15);
  if (grade === GRADE.EASY) c.ease += 0.15;
  c.reps += 1;
  c.due = addDays(today, c.interval);
  return c;
}

export function formatInterval(days) {
  if (days === 0) return 'ngay';
  return days >= 30 ? `${Math.round(days / 30)} th` : `${days} ng`;
}

// Thứ tự ôn: thẻ đến hạn sớm nhất trước, cùng hạn thì thẻ ít lần ôn trước.
export const dueOrder = (a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.reps - b.reps);

export const isMature = (card) => card.interval >= 21;
