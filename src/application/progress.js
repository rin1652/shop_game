// Use case: tiến độ học hằng ngày (bài hôm nay, các bước, chuỗi ngày, lộ trình).
import { state, persist, today } from './ports.js';
import { streak as streakOf } from '../domain/calendar.js';
import { pickLesson, lessonById, LESSONS, ROUTES, DEFAULT_ROUTE, LESSON_PARTS, isLessonComplete } from '../domain/curriculum.js';
import { DAILY_STEPS } from '../data/plan.js';
import { cardStats } from './review.js';

export function getDay(key = today()) {
  const s = state();
  s.days[key] ||= { steps: {}, seconds: 0, reflect: '', lessonId: null };
  return s.days[key];
}

export const routeId = () => (ROUTES[state().route] ? state().route : DEFAULT_ROUTE);
export const currentRoute = () => ROUTES[routeId()];

export function setRoute(id) {
  if (!ROUTES[id]) return;
  const s = state();
  s.route = id;
  const day = getDay();
  // Chưa học bước nào của bài hôm nay → chọn lại theo lộ trình mới.
  if (!LESSON_PARTS.some((k) => day.steps[k])) day.lessonId = null;
  persist();
}

export function todayLesson() {
  const day = getDay();
  if (day.lessonId && lessonById(day.lessonId)) return lessonById(day.lessonId);
  const lesson = pickLesson(routeId(), state().lessonDone);
  day.lessonId = lesson.id;
  persist();
  return lesson;
}

export function chooseTodayLesson(id) {
  if (!lessonById(id)) return;
  getDay().lessonId = id;
  persist();
}

export const lessonParts = (id) => state().lessonSteps?.[id] || {};
export const isLessonDone = (id) => Boolean(state().lessonDone[id]);

// Đánh dấu một bước xong. Trả về những gì vừa hoàn thành để giao diện chúc mừng đúng lúc.
// Không có thẻ nào đến hạn thì bước ôn tập không còn việc gì để làm → tính là xong.
function syncReviewStep(day) {
  if (!day.steps.review && cardStats().due === 0) day.steps.review = 'auto'; // 'auto': không tính là có học
}

export function completeStep(key, lessonId) {
  const s = state();
  const day = getDay();
  syncReviewStep(day);
  const wasDayDone = DAILY_STEPS.every((st) => day.steps[st.key]);
  let lessonCompleted = false;
  if (!lessonId || lessonId === day.lessonId || key === 'review' || key === 'reflect') day.steps[key] = true;
  if (lessonId && LESSON_PARTS.includes(key)) {
    s.lessonSteps ||= {};
    const parts = (s.lessonSteps[lessonId] ||= {});
    parts[key] = true;
    if (isLessonComplete(parts) && !s.lessonDone[lessonId]) {
      s.lessonDone[lessonId] = today();
      lessonCompleted = true;
    }
  }
  persist();
  const dayCompleted = !wasDayDone && DAILY_STEPS.every((st) => day.steps[st.key]);
  return { lessonCompleted, dayCompleted };
}

export function saveReflection(text) {
  getDay().reflect = text;
  persist();
}

export function addStudyTime(seconds) {
  getDay().seconds += seconds;
  persist();
}

export function todaySummary() {
  const day = getDay();
  if (!day.steps.review && cardStats().due === 0) {
    syncReviewStep(day);
    persist();
  }
  const done = DAILY_STEPS.filter((st) => day.steps[st.key]).length;
  return {
    steps: DAILY_STEPS.map((st) => ({ ...st, done: Boolean(day.steps[st.key]) })),
    done,
    total: DAILY_STEPS.length,
    minutes: Math.floor((day.seconds || 0) / 60),
    streak: streakOf(state().days, today()),
    lessonsDone: Object.keys(state().lessonDone).length,
    lessonsTotal: LESSONS.length,
    routeDone: currentRoute().lessons.filter((id) => state().lessonDone[id]).length,
    routeTotal: currentRoute().lessons.length,
  };
}
