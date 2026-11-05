// Unit test cho phần logic (chạy bằng: npm test). Không cần trình duyệt.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// localStorage giả để storage.js lưu được trong Node.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const storage = await import('../src/lib/storage.js');
const srs = await import('../src/lib/srs.js');
const { scoreSpeech } = await import('../src/lib/speech.js');
const gate = await import('../src/lib/aiGate.js');
const { LESSONS } = await import('../src/data/lessons.js');
const { QA_VOCAB, INDIAN_ENGLISH } = await import('../src/data/glossary.js');

beforeEach(() => {
  storage.replaceState({ cards: {}, days: {}, lessonDone: {} });
});

// ---------- Dữ liệu bài học ----------
test('mỗi bài có đủ dữ liệu, id không trùng', () => {
  const ids = new Set();
  for (const l of LESSONS) {
    assert.ok(!ids.has(l.id), 'id trùng: ' + l.id);
    ids.add(l.id);
    assert.equal(l.phrases.length, 8, l.id + ' cần 8 cụm câu');
    assert.ok(l.dialogue.length >= 5, l.id + ' hội thoại quá ngắn');
    assert.ok(l.dialogue.some((d) => d.s === 'M') && l.dialogue.some((d) => d.s === 'I'), l.id + ' cần cả mentor và bạn');
    assert.equal(l.roleplay.length, 3, l.id + ' cần 3 tình huống nhập vai');
    for (const p of [...l.phrases, ...l.dialogue]) assert.ok(p.en?.trim() && p.vi?.trim(), l.id + ' thiếu en/vi');
    for (const r of l.roleplay) assert.ok(r.mentor && r.task && r.sample, l.id + ' nhập vai thiếu trường');
  }
});

test('từ điển không có mục trống', () => {
  for (const v of [...QA_VOCAB, ...INDIAN_ENGLISH]) assert.ok(v.en && v.vi && v.ex);
});

// ---------- Chấm câu ----------
test('scoreSpeech: đúng hết = 100, bỏ qua hoa thường và dấu câu', () => {
  assert.equal(scoreSpeech('Could you say that again, please?', 'could you say that again please').score, 100);
});

test('scoreSpeech: thiếu từ thì đánh dấu miss đúng vị trí', () => {
  const r = scoreSpeech('Could you say that again', 'could you that again');
  assert.ok(r.score < 100 && r.score >= 70);
  assert.deepEqual(r.words.map((w) => w.ok), [true, true, false, true, true]);
});

test('scoreSpeech: nói thêm nhiều từ thừa bị trừ điểm, không quá 100', () => {
  const r = scoreSpeech('Okay', 'okay okay okay okay okay okay');
  assert.ok(r.score < 100);
  assert.equal(scoreSpeech('hi', '').score, 0);
});

test("scoreSpeech: dấu nháy cong và thẳng như nhau (didn't)", () => {
  assert.equal(scoreSpeech('I didn’t catch that', "I didn't catch that").score, 100);
});

// ---------- Ôn tập ngắt quãng ----------
test('thêm thẻ bài học: 8 thẻ cụm câu, thêm lại không trùng', () => {
  assert.equal(srs.addLessonCards('l01'), 8);
  assert.equal(srs.addLessonCards('l01'), 0);
  assert.equal(srs.dueCards().length, 8);
});

test('thẻ luyện nghe chỉ lấy câu của mentor', () => {
  const n = srs.addListeningCards('l01');
  assert.equal(n, LESSONS[0].dialogue.filter((d) => d.s === 'M').length);
  for (const c of srs.dueCards()) assert.equal(srs.cardContent(c.id).mode, 'listen');
});

test('chấm "Được" đẩy thẻ sang ngày sau, khoảng cách tăng dần', () => {
  srs.addCard('v:0');
  const today = storage.todayKey();
  srs.gradeCard('v:0', 2);
  let c = storage.getState().cards['v:0'];
  assert.equal(c.due, storage.addDays(today, 1));
  srs.gradeCard('v:0', 2);
  c = storage.getState().cards['v:0'];
  assert.equal(c.interval, 3);
  srs.gradeCard('v:0', 2);
  assert.ok(storage.getState().cards['v:0'].interval > 3);
  assert.equal(srs.dueCards().length, 0);
});

test('chấm "Quên" giữ thẻ trong hôm nay và giảm độ dễ, không dưới 1.3', () => {
  srs.addCard('i:0');
  for (let k = 0; k < 10; k++) srs.gradeCard('i:0', 0);
  const c = storage.getState().cards['i:0'];
  assert.equal(c.due, storage.todayKey());
  assert.equal(c.ease, 1.3);
  assert.equal(c.lapses, 10);
  assert.equal(srs.dueCards().length, 1);
});

test('xem trước khoảng ôn khớp với kết quả chấm thật', () => {
  srs.addCard('v:1');
  srs.gradeCard('v:1', 2);
  srs.gradeCard('v:1', 2);
  const preview = srs.intervalPreview('v:1', 3);
  srs.gradeCard('v:1', 3);
  assert.equal(preview, `${storage.getState().cards['v:1'].interval} ng`);
});

test('id thẻ không hợp lệ không được thêm', () => {
  assert.equal(srs.addCard('p:l99:0'), false);
  assert.equal(srs.addCard('v:9999'), false);
  assert.equal(srs.addCard('x:1'), false);
});

// ---------- Ngày & chuỗi ngày học ----------
test('addDays qua cuối tháng và cuối năm', () => {
  assert.equal(storage.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(storage.addDays('2026-03-01', -1), '2026-02-28');
});

test('streak đếm các ngày liên tiếp có học, hôm nay chưa học vẫn giữ chuỗi', () => {
  const t = storage.todayKey();
  const s = storage.getState();
  s.days[storage.addDays(t, -1)] = { steps: { review: true }, seconds: 0 };
  s.days[storage.addDays(t, -2)] = { steps: {}, seconds: 600 };
  s.days[storage.addDays(t, -4)] = { steps: { listen: true }, seconds: 0 };
  assert.equal(storage.streak(), 2);
  s.days[t] = { steps: { phrases: true }, seconds: 0 };
  assert.equal(storage.streak(), 3);
});

test('chuyển dữ liệu từ bản cũ (1 key Claude) sang nhiều nhà cung cấp', async () => {
  mem.set('tagt:v1', JSON.stringify({ settings: { apiKey: 'sk-ant-old', model: 'claude-sonnet-5-5' }, cards: {}, days: {}, lessonDone: {} }));
  const fresh = await import('../src/lib/storage.js?migrate');
  const st = fresh.getState().settings;
  assert.equal(st.keys.anthropic, 'sk-ant-old');
  assert.equal(st.models.anthropic, 'claude-sonnet-5-5');
  assert.equal(st.apiKey, undefined);
  mem.delete('tagt:v1');
});

// ---------- Cổng AI ----------
test('gateChat: chặn câu không có chữ và câu trùng, cho phép câu một từ', () => {
  assert.equal(gate.gateChat('???', '').ok, false);
  assert.equal(gate.gateChat('Which browser?', 'which browser').ok, false);
  assert.equal(gate.gateChat('Yes', 'Which browser?').ok, true);
  assert.equal(gate.gateChat('[START]', '').ok, true);
});

test('gateRoleplay: ngắn → từ chối, giống mẫu → cục bộ, khác mẫu → AI', () => {
  const sample = 'Which file formats are supported? And is there a maximum file size?';
  assert.equal(gate.gateRoleplay('', sample).mode, 'reject');
  assert.equal(gate.gateRoleplay('which format', sample).mode, 'reject');
  assert.equal(gate.gateRoleplay('which file formats are supported and is there a maximum file size', sample).mode, 'local');
  assert.equal(gate.gateRoleplay('Can I upload a PNG bigger than five megabytes?', sample).mode, 'ai');
});

test('gateWriting: dùng lại kết quả đã sửa, không phân biệt hoa thường/dấu câu', () => {
  assert.equal(gate.gateWriting('  123 ').mode, 'reject');
  assert.equal(gate.gateWriting('Today I learn English.').mode, 'ai');
  gate.cacheSet('writing', gate.normText('Today I learn English.'), 'corrected!');
  const g = gate.gateWriting('today i learn english');
  assert.equal(g.mode, 'cached');
  assert.equal(g.value, 'corrected!');
});

test('bộ nhớ đệm giới hạn 300 mục, bỏ mục cũ nhất', () => {
  for (let k = 0; k < 320; k++) gate.cacheSet('roleplay', 'q' + k, 'v' + k);
  assert.equal(Object.keys(storage.getState().aiCache).length, 300);
  assert.equal(gate.cacheGet('roleplay', 'q319'), 'v319');
});

test('trimHistory: giữ mở đầu + lượt gần nhất, luân phiên user/assistant, bắt đầu bằng user', () => {
  const m = [{ role: 'user', content: '[START]' }, { role: 'assistant', content: 'open' }];
  for (let k = 0; k < 40; k++) m.push({ role: 'user', content: 'q' + k }, { role: 'assistant', content: 'a' + k });
  m.push({ role: 'user', content: 'last' });
  const t = gate.trimHistory(m);
  assert.ok(t.length <= 26);
  assert.equal(t[1].content, 'open');
  assert.equal(t.at(-1).content, 'last');
  for (let k = 1; k < t.length; k++) assert.notEqual(t[k].role, t[k - 1].role, 'vai trò bị lặp ở vị trí ' + k);
  const short = m.slice(0, 5);
  assert.deepEqual(gate.trimHistory(short), short);
});

test('thống kê AI cộng dồn trong ngày', () => {
  gate.recordCall('a'.repeat(400), 'b'.repeat(40));
  gate.recordAvoided();
  gate.recordAvoided('cached');
  const u = gate.todayUsage();
  assert.equal(u.calls, 1);
  assert.equal(u.inTok, 100);
  assert.equal(u.outTok, 10);
  assert.equal(u.avoided, 1);
  assert.equal(u.cached, 1);
});
