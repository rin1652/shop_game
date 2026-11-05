// Giả lập một học viên "bập bẹ" học lộ trình nhanh 14 ngày trên app thật (Chromium), rồi làm bài kiểm tra
// về nền tảng Chunk → RAG → Self-healing. Chạy: npm run build && node tests/learner-sim.cjs
//
// Mô hình học viên (đơn giản, có chủ đích):
// - Biết sẵn ~180 từ rất cơ bản. Một từ mới "thuộc" khi đã gặp ≥ 3 lần (học bài, ôn thẻ).
// - Khi nói/viết: chỉ dùng được từ đã thuộc, bỏ mất từ chưa thuộc, hay quên mạo từ (30%).
// - Khi nghe chép: gõ đúng từ đã thuộc, bỏ sót từ chưa thuộc.
// - AI chấm giả lập: "Đạt" nếu câu trả lời giữ được ≥ 55% ý của câu mẫu (theo từ) và có thuật ngữ chính.
// Giới hạn: KHÔNG mô phỏng tốc độ nói, phát âm, áp lực cuộc gọi thật hay giọng Ấn nhanh.
const { chromium, devices } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 4181;
const URL = `http://localhost:${PORT}/`;
const DAYS = 14;
const START = new Date('2026-11-09T19:00:00');

const BASIC = new Set(`a an the and or but if so to of in on at by for with from up out about into over after before than then
is are was were be been am do does did done have has had will would can could should may might must shall
i you he she it we they me him her us them my your our their this that these those there here what which who how why when where
not no yes ok okay please sorry thanks thank hi hello sure right good bad new old more most less very too also only just all any some
one two three four five six seven eight nine ten first second third last next other same each every many much few
make get go come see look find use give take tell say ask know think want need try work fix check send share help start finish
day week today tomorrow yesterday time now friday thursday monday minute hour page button text test tests problem name like let`.split(/\s+/));

const words = (s) => (s.toLowerCase().replace(/[’']/g, "'").match(/[a-z][a-z0-9'-]*|\d+(\.\d+)?/g) || []);
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// SIM_HARD=1: học viên khắt khe hơn — cần gặp 5 lần mới thuộc, khi trả lời quên 25% từ đã biết (áp lực cuộc gọi).
const HARD = process.env.SIM_HARD === '1';
const NEED = HARD ? 5 : 3;
const exposure = new Map();
const knows = (w) => BASIC.has(w) || /^\d/.test(w) || (exposure.get(w) || 0) >= NEED;
const expose = (text, times = 1) => words(text).forEach((w) => exposure.set(w, (exposure.get(w) || 0) + times));
const produce = (sample) =>
  words(sample)
    .filter(knows)
    .filter((w) => !((w === 'the' || w === 'a' || w === 'an') && rand() < 0.3))
    .filter((w) => !(HARD && !BASIC.has(w) && rand() < 0.25))
    .join(' ');
const knownRatio = (text) => {
  const ws = words(text);
  return ws.length ? ws.filter(knows).length / ws.length : 1;
};

(async () => {
  const { LESSONS } = await import('../src/data/lessons.js');
  const { PLATFORM_EXAM, PLATFORM_TERMS } = await import('../src/data/exam.js');
  const { scoreSpeech } = await import('../src/domain/scoring.js');
  const byId = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('tagt:v1', JSON.stringify({ route: 'fast', settings: { provider: 'openai', keys: { openai: 'sk-sim' }, models: { openai: 'sim-grader' }, autoSpeak: false }, cards: {}, days: {}, lessonDone: {} }));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let aiCalls = 0;

  // AI chấm giả lập (xem mô tả ở đầu file).
  await page.route('https://api.openai.com/**', async (route) => {
    aiCalls++;
    const body = JSON.parse(route.request().postData());
    const msg = body.messages.at(-1).content;
    const sample = (msg.match(/Model answer: "([^"]*)"/) || [])[1] || '';
    const answer = (msg.match(/Intern answered[^"]*"([^"]*)"/) || [])[1] || '';
    const { score } = scoreSpeech(sample, answer);
    const terms = PLATFORM_TERMS.filter((t) => sample.toLowerCase().includes(t));
    const hasTerm = !terms.length || terms.some((t) => answer.toLowerCase().includes(t.split(' ')[0]));
    const text = score >= 55 && hasTerm ? `✅ Đạt: rõ ý (${score}%)` : `⚠️ Gần đạt: thiếu ý (${score}%)`;
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/event-stream' }, body: `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n` });
  });

  const closeOverlay = async () => {
    for (const b of await page.$$('.celebrate [data-close]')) await b.click().catch(() => {});
    await page.waitForTimeout(280);
  };
  const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('tagt:v1')));

  // Làm bài kiểm tra trên trang #/exam bằng vốn từ hiện tại. Trả về số câu đạt theo chủ đề.
  async function takeExam() {
    await page.goto(URL + '#/exam');
    await page.waitForSelector('[data-rp]');
    const res = { healing: [0, 0], rag: [0, 0], chunk: [0, 0] };
    for (let i = 0; i < PLATFORM_EXAM.length; i++) {
      const q = PLATFORM_EXAM[i];
      const card = page.locator(`[data-rp="${i}"]`);
      await card.locator('.rp-answer input').fill(produce(q.sample));
      await card.locator('[data-eval]').click();
      await page.waitForFunction((i) => {
        const t = document.querySelector(`[data-rp="${i}"] .rp-eval`)?.textContent || '';
        return t && !t.includes('Đang chấm');
      }, i);
      const t = await card.locator('.rp-eval').textContent();
      res[q.topic][1]++;
      if (t.includes('✅')) res[q.topic][0]++;
    }
    const total = Object.values(res).reduce((a, [p]) => a + p, 0);
    return { total, res };
  }

  await page.clock.install({ time: START });
  await page.goto(URL);
  await page.waitForSelector('.hero');

  const baseline = await takeExam();
  const resetExam = () => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('tagt:v1'));
    s.exam = {};
    localStorage.setItem('tagt:v1', JSON.stringify(s));
  });
  await resetExam();

  const log = [];
  for (let d = 0; d < DAYS; d++) {
    await page.clock.setSystemTime(new Date(START.getTime() + d * 86400000));
    await page.goto(URL + '#/today');
    await page.reload();
    await page.waitForSelector('.hero');
    const lessonId = (await st()).days[(await page.evaluate(() => {
      const t = new Date();
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }))].lessonId;
    const lesson = byId[lessonId];

    // 1) Ôn flashcard: chấm theo mức từ đã thuộc trong thẻ.
    await page.goto(URL + '#/review');
    let reviewed = 0;
    let again = 0;
    while (await page.$('#flip')) {
      await page.click('#flip');
      const back = await page.textContent('.answer .back');
      const front = (await page.$('.flash .front')) ? await page.textContent('.flash .front') : '';
      const ratio = knownRatio(back);
      const g = ratio >= 0.95 ? (rand() < 0.3 ? 'easy' : 'good') : ratio >= 0.8 ? 'good' : ratio >= 0.6 ? 'ok' : 'bad';
      if (g === 'bad') again++;
      expose(back + ' ' + front);
      await page.click(`.grade.${g}`);
      reviewed++;
      if (reviewed > 80) break;
    }
    await closeOverlay();

    // 2) Nghe & nhại + nghe chép (đo trước khi học bài, sau khi đã ôn).
    await page.goto(URL + `#/lesson/${lessonId}/dialogue`);
    await page.waitForSelector('.dialogue');
    await page.check('#dictation');
    const dict = [];
    for (const [i, line] of lesson.dialogue.entries()) {
      if (line.s !== 'M') continue;
      const typed = words(line.en).filter(knows).join(' ');
      const bubble = page.locator(`.bubble[data-i="${i}"]`);
      await bubble.locator('.dict input').fill(typed);
      await bubble.locator('[data-check]').click();
      const scoreEl = bubble.locator('.dict-out .score b');
      dict.push((await scoreEl.count()) ? parseInt(await scoreEl.textContent(), 10) : 0); // không nghe ra từ nào = 0%
    }
    lesson.dialogue.forEach((l) => expose(l.en, 2)); // nghe 2 lần + nhại
    await page.click('#finish');
    await closeOverlay();

    // 3) Cụm câu: nghe mẫu và nói theo (nhại 2 lần).
    await page.waitForSelector('.phrases');
    lesson.phrases.forEach((p) => expose(p.en, 2));
    await page.click('#finish');
    await closeOverlay();

    // 4) Nhập vai: trả lời bằng vốn từ hiện có, app chấm (cục bộ hoặc AI).
    await page.waitForSelector('.roleplay');
    let rpPass = 0;
    for (const [i, r] of lesson.roleplay.entries()) {
      expose(r.mentor);
      const card = page.locator(`[data-rp="${i}"]`);
      await card.locator('.rp-answer input').fill(produce(r.sample));
      await card.locator('[data-eval]').click();
      await page.waitForFunction((i) => {
        const t = document.querySelector(`[data-rp="${i}"] .rp-eval`)?.textContent || '';
        return t && !t.includes('Đang chấm');
      }, i);
      if ((await card.locator('.rp-eval').textContent()).includes('✅')) rpPass++;
      expose(r.sample); // xem câu mẫu sau khi trả lời
    }
    await page.click('#finish');
    await closeOverlay();

    // 5) Viết tổng kết.
    await page.goto(URL + '#/today/reflect');
    await page.fill('#reflect', `Today I learned ${lesson.titleEn.toLowerCase()}. Tomorrow I will practise more.`);
    await page.click('#saveReflect');
    await page.waitForSelector('.hero');
    await closeOverlay();
    const done = (await page.textContent('[data-steps]')).trim();
    const streakNow = (await page.textContent('[data-streak]')).trim();
    log.push({ day: d + 1, lesson: lessonId, reviewed, again, dict: Math.round(dict.reduce((a, b) => a + b, 0) / dict.length), rp: `${rpPass}/3`, steps: done, streak: streakNow });
  }

  await page.clock.setSystemTime(new Date(START.getTime() + DAYS * 86400000));
  await page.reload();
  const after = await takeExam();
  const s = await st();
  const termsKnown = PLATFORM_TERMS.filter((t) => t.split(' ').every((w) => knows(w))).length;

  console.log('Ngày | Bài | Ôn thẻ (quên) | Nghe chép | Nhập vai đạt | Bước | Chuỗi ngày');
  for (const r of log) console.log(`${String(r.day).padStart(4)} | ${r.lesson} | ${String(r.reviewed).padStart(3)} (${r.again}) | ${String(r.dict).padStart(3)}% | ${r.rp} | ${r.steps} | ${r.streak}`);
  const fmt = (x) => `${x.total}/20 (self-healing ${x.res.healing[0]}/${x.res.healing[1]}, RAG ${x.res.rag[0]}/${x.res.rag[1]}, chunk ${x.res.chunk[0]}/${x.res.chunk[1]})`;
  console.log(`\nBài kiểm tra TRƯỚC khi học: ${fmt(baseline)}`);
  console.log(`Bài kiểm tra SAU 14 ngày : ${fmt(after)}`);
  console.log(`Thuật ngữ nền tảng đã thuộc: ${termsKnown}/${PLATFORM_TERMS.length}`);
  console.log(`Bài đã học: ${Object.keys(s.lessonDone).length} · Thẻ: ${Object.keys(s.cards).length} · Lần gọi AI (chấm): ${aiCalls} · Lỗi JS: ${errors.length}`);
  await browser.close();
  server.kill();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
