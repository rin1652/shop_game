// Unit test (chạy: npm test). Tầng domain test trực tiếp; tầng application test qua ports giả
// (bộ nhớ trong RAM, đồng hồ cố định, AI giả) — không cần trình duyệt hay mạng.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setPorts } from '../src/application/ports.js';
import { createLocalStore, normalize } from '../src/infrastructure/localStore.js';
import * as review from '../src/application/review.js';
import * as progress from '../src/application/progress.js';
import * as coach from '../src/application/coach.js';
import * as usage from '../src/application/usage.js';
import * as prefs from '../src/application/preferences.js';
import { scoreSpeech } from '../src/domain/scoring.js';
import { schedule, GRADE, newCard } from '../src/domain/scheduling.js';
import { addDays, streak } from '../src/domain/calendar.js';
import { decideChat, decideAnswer, decideWriting, trimHistory } from '../src/domain/aiPolicy.js';
import { pickLesson, cardContent, LESSONS, ROUTES } from '../src/domain/curriculum.js';
import { QA_VOCAB, INDIAN_ENGLISH, AI_TEST_VOCAB } from '../src/data/glossary.js';
import { PLATFORM_EXAM } from '../src/data/exam.js';
import { PROVIDERS } from '../src/infrastructure/ai/rest.js';

const TODAY = '2026-11-05';
let fakeAI;
let store;

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

function makeFakeAI() {
  const ai = {
    providers: PROVIDERS,
    calls: [],
    reply: 'Hello from mentor\n###\n✔️ Sửa: ok',
    fail: null,
    async chat(config, req) {
      ai.calls.push({ config, req });
      if (ai.fail) throw new Error(ai.fail);
      if (req.signal?.aborted) return '';
      req.onText?.(ai.reply);
      return ai.reply;
    },
    async listModels() {
      return [{ id: 'm1', label: 'Model 1' }];
    },
  };
  return ai;
}

beforeEach(() => {
  store = createLocalStore(memoryStorage());
  fakeAI = makeFakeAI();
  setPorts({ store, clock: { today: () => TODAY }, ai: fakeAI });
});

const withKey = () => {
  prefs.updateSettings({ provider: 'openai' });
  prefs.setProviderKey('openai', 'sk-test');
  prefs.setProviderModel('openai', 'gpt-test');
};

// ---------- Dữ liệu ----------
test('mỗi bài có đủ dữ liệu, id không trùng, lộ trình chỉ chứa bài có thật', () => {
  const ids = new Set();
  for (const l of LESSONS) {
    assert.ok(!ids.has(l.id), 'id trùng: ' + l.id);
    ids.add(l.id);
    assert.equal(l.phrases.length, 8, l.id + ' cần 8 cụm câu');
    assert.ok(l.dialogue.some((d) => d.s === 'M') && l.dialogue.some((d) => d.s === 'I'), l.id);
    assert.equal(l.roleplay.length, 3, l.id);
    for (const p of [...l.phrases, ...l.dialogue]) assert.ok(p.en?.trim() && p.vi?.trim(), l.id);
  }
  for (const r of Object.values(ROUTES)) for (const id of r.lessons) assert.ok(ids.has(id), 'lộ trình có bài lạ: ' + id);
  assert.equal(new Set(ROUTES.fast.lessons).size, ROUTES.fast.lessons.length);
});

test('từ điển và bài kiểm tra không có mục trống', () => {
  for (const v of [...QA_VOCAB, ...INDIAN_ENGLISH, ...AI_TEST_VOCAB]) assert.ok(v.en && v.vi && v.ex);
  assert.equal(PLATFORM_EXAM.length, 20);
  assert.ok(PLATFORM_EXAM.filter((q) => q.topic === 'healing').length >= 10, 'self-healing phải là trọng tâm');
  for (const q of PLATFORM_EXAM) assert.ok(q.mentor && q.task && q.sample && q.fn);
});

// ---------- Domain: chấm câu ----------
test('scoreSpeech: đúng hết = 100, bỏ qua hoa thường, dấu câu, kiểu dấu nháy', () => {
  assert.equal(scoreSpeech('Could you say that again, please?', 'could you say that again please').score, 100);
  assert.equal(scoreSpeech('I didn’t catch that', "I didn't catch that").score, 100);
});

test('scoreSpeech: thiếu từ đánh dấu đúng vị trí; nói thừa bị trừ; rỗng = 0', () => {
  const r = scoreSpeech('Could you say that again', 'could you that again');
  assert.deepEqual(r.words.map((w) => w.ok), [true, true, false, true, true]);
  assert.ok(scoreSpeech('Okay', 'okay okay okay okay okay').score < 100);
  assert.equal(scoreSpeech('hi', '').score, 0);
});

// ---------- Domain: lịch ôn & ngày ----------
test('schedule: "Được" giãn dần, "Quên" quay lại hôm nay, độ dễ không dưới 1.3', () => {
  let c = newCard('v:0', TODAY);
  c = schedule(c, GRADE.GOOD, TODAY);
  assert.equal(c.due, addDays(TODAY, 1));
  c = schedule(c, GRADE.GOOD, TODAY);
  assert.equal(c.interval, 3);
  c = schedule(c, GRADE.GOOD, TODAY);
  assert.ok(c.interval > 3);
  for (let k = 0; k < 10; k++) c = schedule(c, GRADE.AGAIN, TODAY);
  assert.equal(c.due, TODAY);
  assert.equal(c.ease, 1.3);
});

test('addDays qua cuối tháng/năm; streak giữ chuỗi khi hôm nay chưa học', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  const days = { [addDays(TODAY, -1)]: { steps: { review: true } }, [addDays(TODAY, -2)]: { seconds: 600 }, [addDays(TODAY, -4)]: { steps: { listen: true } } };
  assert.equal(streak(days, TODAY), 2);
  days[TODAY] = { steps: { phrases: true } };
  assert.equal(streak(days, TODAY), 3);
});

// ---------- Domain: lộ trình ----------
test('pickLesson theo lộ trình nhanh: bài 1, rồi l03, rồi bài self-healing l15', () => {
  assert.equal(pickLesson('fast', {}).id, 'l01');
  assert.equal(pickLesson('fast', { l01: 'x' }).id, 'l03');
  assert.equal(pickLesson('fast', { l01: 'x', l03: 'x' }).id, 'l15');
  assert.equal(pickLesson('standard', { l01: 'x' }).id, 'l02');
  const allFast = Object.fromEntries(ROUTES.fast.lessons.map((id) => [id, '2026-01-01']));
  assert.ok(!ROUTES.fast.lessons.includes(pickLesson('fast', allFast).id), 'xong lộ trình nhanh thì học tiếp bài chưa học');
  const all = Object.fromEntries(LESSONS.map((l, i) => [l.id, `2026-01-${String(30 - (i % 28)).padStart(2, '0')}`]));
  assert.ok(pickLesson('fast', all), 'học hết thì vẫn có bài để ôn');
});

test('cardContent: các loại thẻ, id lạ trả về null', () => {
  assert.equal(cardContent('p:l15:0').mode, 'produce');
  assert.equal(cardContent('d:l15:0').mode, 'listen');
  assert.equal(cardContent('d:l15:1'), null, 'câu của người học không thành thẻ luyện nghe');
  assert.equal(cardContent('a:0').tag, 'AI testing');
  assert.equal(cardContent('p:l99:0'), null);
  assert.equal(cardContent('x:1'), null);
});

// ---------- Domain: chính sách AI ----------
test('decideChat / decideAnswer / decideWriting', () => {
  assert.equal(decideChat('???', '').ok, false);
  assert.equal(decideChat('Which browser?', 'which browser').ok, false);
  assert.equal(decideChat('Yes', 'Which browser?').ok, true);
  const sample = 'Which file formats are supported? And is there a maximum file size?';
  assert.equal(decideAnswer('which format', sample).mode, 'reject');
  assert.equal(decideAnswer('which file formats are supported and is there a maximum file size', sample).mode, 'local');
  assert.equal(decideAnswer('Can I upload a PNG bigger than five megabytes?', sample).mode, 'ai');
  assert.equal(decideWriting(' 123 ', null).mode, 'reject');
  assert.equal(decideWriting('Today I learn.', 'cached!').mode, 'cached');
});

test('trimHistory: giữ mở đầu + lượt gần nhất, luân phiên vai trò', () => {
  const m = [{ role: 'user', content: '[START]' }, { role: 'assistant', content: 'open' }];
  for (let k = 0; k < 40; k++) m.push({ role: 'user', content: 'q' + k }, { role: 'assistant', content: 'a' + k });
  m.push({ role: 'user', content: 'last' });
  const t = trimHistory(m);
  assert.ok(t.length <= 26);
  assert.equal(t[1].content, 'open');
  assert.equal(t.at(-1).content, 'last');
  for (let k = 1; k < t.length; k++) assert.notEqual(t[k].role, t[k - 1].role);
});

// ---------- Infrastructure: kho dữ liệu ----------
test('chuyển dữ liệu từ bản cũ (1 key Claude) sang nhiều nhà cung cấp', () => {
  const s = createLocalStore(memoryStorage({ 'tagt:v1': JSON.stringify({ settings: { apiKey: 'sk-ant-old', model: 'claude-sonnet-5-5' }, cards: {} }) })).state();
  assert.equal(s.settings.keys.anthropic, 'sk-ant-old');
  assert.equal(s.settings.models.anthropic, 'claude-sonnet-5-5');
  assert.equal(s.settings.apiKey, undefined);
  assert.equal(normalize({}).chat.scenario, 'selfheal');
});

// ---------- Application: ôn tập ----------
test('thẻ bài học & luyện nghe: thêm không trùng, chỉ câu mentor', () => {
  assert.equal(review.addLessonCards('l15'), 8);
  assert.equal(review.addLessonCards('l15'), 0);
  const n = review.addListeningCards('l15');
  assert.equal(n, LESSONS.find((l) => l.id === 'l15').dialogue.filter((d) => d.s === 'M').length);
  assert.equal(review.dueCards().length, 8 + n);
  review.gradeCard(review.dueCards()[0].id, GRADE.GOOD);
  assert.equal(review.dueCards().length, 8 + n - 1);
  assert.equal(review.addGlossaryCards('ai'), AI_TEST_VOCAB.length);
});

// ---------- Application: tiến độ ----------
test('completeStep: xong 3 phần → bài hoàn thành; xong 5 bước → buổi học hoàn thành đúng 1 lần', () => {
  const lesson = progress.todayLesson();
  assert.equal(lesson.id, 'l01');
  assert.equal(progress.completeStep('listen', 'l01').lessonCompleted, false);
  progress.completeStep('phrases', 'l01');
  assert.equal(progress.completeStep('roleplay', 'l01').lessonCompleted, true);
  const r = progress.completeStep('reflect');
  assert.equal(r.dayCompleted, true);
  assert.equal(progress.completeStep('reflect').dayCompleted, false);
  assert.equal(progress.todaySummary().done, 5);
});

test('không có thẻ đến hạn → bước ôn tập tự tính là xong; có thẻ đến hạn thì chưa', () => {
  assert.equal(progress.todaySummary().steps.find((s) => s.key === 'review').done, true);
  assert.equal(progress.todaySummary().streak, 0, 'chỉ mở app thì không tính là có học');
  store.state().days = {};
  review.addCard('v:0');
  assert.equal(progress.todaySummary().steps.find((s) => s.key === 'review').done, false);
});

test('đổi lộ trình khi chưa học bước nào → bài hôm nay đổi theo', () => {
  progress.setRoute('fast');
  store.state().lessonDone = { l01: 'x', l03: 'x' };
  progress.getDay().lessonId = null;
  assert.equal(progress.todayLesson().id, 'l15');
  progress.setRoute('standard');
  assert.equal(progress.todayLesson().id, 'l02');
});

// ---------- Application: AI coach ----------
test('sendToMentor: chặn câu trùng, rút gọn lịch sử, ghi đúng cuộc hội thoại', async () => {
  withKey();
  coach.startChat({ scenarioId: 'selfheal' });
  let r = await coach.sendToMentor('[START]');
  assert.equal(r.ok, true);
  r = await coach.sendToMentor('The heal was wrong on checkout');
  assert.equal(coach.chatSession().messages.length, 4);
  r = await coach.sendToMentor('the heal was wrong on checkout');
  assert.equal(r.ok, false);
  assert.equal(fakeAI.calls.length, 2);
  assert.match(fakeAI.calls[1].req.system, /self-healing/);
  assert.equal(fakeAI.calls[1].config.model, 'gpt-test');
});

test('sendToMentor: AI lỗi → gỡ câu vừa gửi và lưu; đổi tình huống giữa chừng không ảnh hưởng cuộc mới', async () => {
  withKey();
  coach.startChat({ scenarioId: 'rag' });
  await coach.sendToMentor('[START]');
  fakeAI.fail = 'Máy chủ AI đang bận.';
  await assert.rejects(coach.sendToMentor('What is top-k?'), /bận/);
  assert.equal(coach.chatSession().messages.length, 2);
  fakeAI.fail = null;
  // Đổi tình huống trong lúc chờ AI.
  let release;
  fakeAI.chat = async (config, req) => {
    await new Promise((r) => (release = r));
    return 'late reply';
  };
  const pending = coach.sendToMentor('Why chunks?');
  coach.startChat({ scenarioId: 'standup' });
  release();
  await pending;
  assert.equal(coach.chatSession().scenario, 'standup');
  assert.equal(coach.chatSession().messages.length, 0, 'câu trả lời muộn không lọt vào cuộc hội thoại mới');
});

test('evaluateAnswer: cục bộ / không key / AI / dùng lại kết quả', async () => {
  const item = { prompt: 'What chunk size?', task: 'Trả lời 500 token, overlap 50.', sample: 'We use five hundred tokens per chunk, with an overlap of fifty tokens.' };
  assert.equal((await coach.evaluateAnswer({ ...item, answer: 'five hundred' })).mode, 'reject');
  assert.equal((await coach.evaluateAnswer({ ...item, answer: 'we use five hundred tokens per chunk with an overlap of fifty tokens' })).mode, 'local');
  assert.equal((await coach.evaluateAnswer({ ...item, answer: 'Our chunks are about 500 tokens and overlap 50' })).mode, 'nokey');
  withKey();
  fakeAI.reply = '✅ Đạt: rõ ý';
  assert.equal((await coach.evaluateAnswer({ ...item, answer: 'Our chunks are about 500 tokens and overlap 50' })).mode, 'ai');
  assert.equal((await coach.evaluateAnswer({ ...item, answer: 'our chunks are about 500 tokens, and overlap 50.' })).mode, 'cached');
  assert.equal(fakeAI.calls.length, 1);
  const u = usage.todayUsage();
  assert.equal(u.calls, 1);
  assert.equal(u.cached, 1);
  assert.equal(u.avoided, 1);
});

test('correctWriting: dùng lại kết quả, không gọi AI lần 2', async () => {
  withKey();
  fakeAI.reply = 'corrected';
  assert.equal((await coach.correctWriting('Today I learn about healing.')).mode, 'ai');
  const r = await coach.correctWriting('today i learn about healing');
  assert.equal(r.mode, 'cached');
  assert.equal(r.value, 'corrected');
  assert.equal(fakeAI.calls.length, 1);
});

test('bộ nhớ đệm giới hạn 300 mục', () => {
  for (let k = 0; k < 320; k++) usage.cacheSet('k' + k, 'v' + k);
  assert.equal(Object.keys(store.state().aiCache).length, 300);
  assert.equal(usage.cacheGet('k319'), 'v319');
});

test('sao lưu không chứa key; khôi phục giữ key hiện tại', () => {
  withKey();
  review.addCard('v:3');
  const data = prefs.exportProgress();
  assert.equal(JSON.stringify(data).includes('sk-test'), false);
  prefs.resetProgress();
  assert.equal(review.hasCard('v:3'), false);
  prefs.importProgress(data);
  assert.equal(review.hasCard('v:3'), true);
  assert.equal(prefs.settings().keys.openai, 'sk-test');
  assert.throws(() => prefs.importProgress({ foo: 1 }));
});
