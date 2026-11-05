// Use case: thẻ ôn tập (thêm thẻ, hàng đợi đến hạn, chấm thẻ).
import { state, persist, today } from './ports.js';
import { newCard, schedule, nextInterval, formatInterval, dueOrder, isMature } from '../domain/scheduling.js';
import { cardContent, phraseCardIds, listeningCardIds, GLOSSARY_LISTS } from '../domain/curriculum.js';

export { cardContent };

export const hasCard = (id) => Boolean(state().cards[id]);

export function addCard(id) {
  const s = state();
  if (s.cards[id] || !cardContent(id)) return false;
  s.cards[id] = newCard(id, today());
  persist();
  return true;
}

const addMany = (ids) => ids.filter(addCard).length;
export const addLessonCards = (lessonId) => addMany(phraseCardIds(lessonId));
export const addListeningCards = (lessonId) => addMany(listeningCardIds(lessonId));
export const addGlossaryCards = (listKey) => {
  const g = GLOSSARY_LISTS[listKey];
  return g ? addMany(g.list.map((_, i) => `${g.prefix}:${i}`)) : 0;
};

export function dueCards() {
  const t = today();
  return Object.values(state().cards)
    .filter((c) => c.due <= t && cardContent(c.id))
    .sort(dueOrder);
}

export function gradeCard(id, grade) {
  const s = state();
  if (!s.cards[id]) return;
  s.cards[id] = schedule(s.cards[id], grade, today());
  persist();
}

export function intervalPreview(id, grade) {
  const c = state().cards[id];
  return c ? formatInterval(nextInterval(c, grade)) : '';
}

export function cardStats() {
  const cards = Object.values(state().cards);
  const t = today();
  return { total: cards.length, due: cards.filter((c) => c.due <= t).length, mature: cards.filter(isMature).length };
}
