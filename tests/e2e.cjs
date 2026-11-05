// Test end-to-end trên trình duyệt thật (Chromium + Playwright), AI được giả lập.
// Chạy: npm run build && npm run test:e2e   (cần Playwright có sẵn trên máy)
const { chromium, devices } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS_DIR || '';
const results = [];
let failed = 0;

function check(name, cond, detail = '') {
  results.push(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failed++;
}

// AI giả: trả lời dạng stream theo chuẩn OpenAI. Có thể cho lỗi hoặc trả lời chậm.
function mockAI(page, state) {
  return page.route('https://api.openai.com/**', async (route) => {
    state.calls++;
    const body = JSON.parse(route.request().postData() || '{}');
    state.last = body;
    if (state.fail) return route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    const last = body.messages?.at(-1)?.content;
    const text = last === '[START]' ? 'Hi Phuc, please test the new search page, okay?' : 'Good question. Only on Chrome.\n###\n✔️ Sửa: Câu của bạn ổn.\n💬 Tự nhiên hơn: Which browsers should I test?\n💡 Hỏi tiếp về deadline.';
    if (state.slow) await new Promise((r) => setTimeout(r, state.slow));
    const chunks = text.match(/.{1,12}/gs).map((t) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/event-stream' }, body: chunks.join('') + 'data: [DONE]\n\n' }).catch(() => {});
  });
}

const withKey = { settings: { provider: 'openai', keys: { openai: 'sk-test' }, models: { openai: 'gpt-test' } }, cards: {}, days: {}, lessonDone: {} };

async function seed(page, state) {
  await page.goto(URL);
  await page.evaluate((s) => localStorage.setItem('tagt:v1', JSON.stringify(s)), state);
  await page.reload();
}

const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  try {
    // 1. Màn hình nhỏ (iPhone SE 320px): không trang nào bị tràn ngang.
    {
      const ctx = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await seed(page, withKey);
      const routes = ['#/today', '#/lessons', '#/lesson/l09/dialogue', '#/lesson/l09/phrases', '#/lesson/l09/roleplay', '#/review', '#/chat', '#/glossary/qa', '#/glossary/indian', '#/glossary/accent', '#/settings', '#/today/reflect', '#/exam', '#/glossary/ai'];
      const st = { calls: 0 };
      await mockAI(page, st);
      for (const r of routes) {
        await page.goto(URL + r);
        await page.waitForTimeout(350);
        const o = await overflowX(page);
        check(`320px không tràn ngang: ${r}`, o <= 0, o > 0 ? `tràn ${o}px` : '');
      }
      await page.goto(URL + '#/lesson/l01/dialogue');
      await page.check('#dictation');
      await page.waitForTimeout(100);
      check('320px nghe chép không tràn', (await overflowX(page)) <= 0);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'se-dictation.png') });
      check('320px không lỗi JS', errors.length === 0, errors.join('; '));
      await ctx.close();
    }

    // 2. Giao diện tối: chữ đọc được (độ tương phản đủ) ở các thành phần chính.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'], colorScheme: 'dark' });
      const page = await ctx.newPage();
      await seed(page, withKey);
      await page.goto(URL + '#/lesson/l01/dialogue');
      await page.waitForSelector('.line.mentor');
      const contrast = await page.evaluate(() => {
        const parse = (c) => {
          const v = c.match(/[\d.]+/g).map(Number);
          return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
        };
        const lum = ({ r, g, b }) => {
          const f = (v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        // Ghép các lớp nền bán trong suốt từ ngoài vào trong để có màu nền thật sau chữ.
        const bgOf = (el) => {
          const layers = [];
          for (let n = el; n; n = n.parentElement) {
            const c = parse(getComputedStyle(n).backgroundColor);
            if (c.a > 0) layers.push(c);
            if (c.a >= 1) break;
          }
          let out = layers.length && layers.at(-1).a >= 1 ? layers.pop() : parse(getComputedStyle(document.body).backgroundColor);
          for (const c of layers.reverse()) out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) };
          return out;
        };
        const ratio = (el) => {
          const a = lum(parse(getComputedStyle(el).color)), b = lum(bgOf(el));
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        const sel = ['.line.mentor .en', '.line.me .en', '.hint', '.btn', '.btn.filled', 'nav.bottom a', 'nav.bottom a.active', '.secondary', '.eyebrow'];
        return sel.map((s) => [s, ratio(document.querySelector(s))]);
      });
      for (const [s, r] of contrast) check(`tối: tương phản ${s} ≥ 4.5`, r >= 4.5, r.toFixed(2));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'dark-dialogue.png') });
      await ctx.close();
    }

    // 3. Sang ngày mới: bài hôm qua đã xong → hôm nay sang bài tiếp; chuỗi ngày = 2.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await ctx.newPage();
      await page.goto(URL);
      const y = await page.evaluate(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });
      await seed(page, { ...withKey, lessonDone: { l01: y }, lessonSteps: { l01: { listen: true, phrases: true, roleplay: true } }, days: { [y]: { steps: { listen: true, phrases: true, roleplay: true }, seconds: 3600, lessonId: 'l01' } } });
      await page.waitForSelector('.lesson-card');
      const tag = await page.textContent('[data-lesson-tag]');
      check('ngày mới chọn bài tiếp theo của lộ trình nhanh (bài 3)', tag.includes('Bài 3'), tag);
      const streakTxt = (await page.textContent('[data-streak]')).trim();
      check('chuỗi ngày vẫn giữ khi hôm nay chưa học', streakTxt === '1', streakTxt);
      await ctx.close();
    }

    // 4. Ôn tập: "Quên" → thẻ quay lại; ôn hết → bước ôn tập được đánh dấu xong.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await ctx.newPage();
      await seed(page, { ...withKey, cards: { 'v:0': { id: 'v:0', due: '2000-01-01', interval: 0, ease: 2.5, reps: 0, lapses: 0 }, 'v:1': { id: 'v:1', due: '2000-01-01', interval: 0, ease: 2.5, reps: 0, lapses: 0 } } });
      await page.goto(URL + '#/review');
      await page.waitForSelector('.flash');
      check('chưa lật thì nút chấm bị ẩn', !(await page.isVisible('.grades')));
      await page.click('#flip');
      await page.click('.grade.bad');
      check('sau "Quên" vẫn còn 2 thẻ', (await page.textContent('[data-left]')).includes('2'));
      for (let k = 0; k < 3; k++) {
        if (!(await page.$('#flip'))) break;
        await page.click('#flip');
        await page.click('.grade.good');
      }
      await page.waitForSelector('.empty');
      const done = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tagt:v1')).days).some((d) => d.steps?.review));
      check('ôn hết thẻ → bước ôn tập xong', done);
      await ctx.close();
    }

    // 5. Sao lưu → xoá → khôi phục: giữ tiến độ, file sao lưu không chứa key.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'], acceptDownloads: true });
      const page = await ctx.newPage();
      await seed(page, { ...withKey, cards: { 'v:3': { id: 'v:3', due: '2030-01-01', interval: 9, ease: 2.5, reps: 3, lapses: 0 } }, lessonDone: { l01: '2026-01-01' } });
      await page.goto(URL + '#/settings');
      await page.waitForSelector('#export');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
      const file = await dl.path();
      const data = JSON.parse(require('node:fs').readFileSync(file, 'utf8'));
      check('file sao lưu không có API key', JSON.stringify(data).indexOf('sk-test') === -1);
      page.once('dialog', (d) => d.accept());
      await page.click('#reset');
      await page.waitForTimeout(300);
      check('xoá tiến độ giữ lại key', (await page.evaluate(() => JSON.parse(localStorage.getItem('tagt:v1')).settings.keys.openai)) === 'sk-test');
      await page.goto(URL + '#/settings');
      await page.setInputFiles('#import', file);
      await page.waitForTimeout(400);
      const st = await page.evaluate(() => JSON.parse(localStorage.getItem('tagt:v1')));
      check('khôi phục: thẻ và bài đã học trở lại', Boolean(st.cards['v:3'] && st.lessonDone.l01));
      check('khôi phục: key vẫn còn', st.settings.keys.openai === 'sk-test');
      await ctx.close();
    }

    // 6. Chat: AI lỗi → câu của bạn được trả lại ô nhập, không mất lịch sử.
    //    Rời trang khi AI đang trả lời → không lỗi, lịch sử không hỏng.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const st = { calls: 0 };
      await mockAI(page, st);
      await seed(page, withKey);
      await page.goto(URL + '#/chat');
      await page.waitForSelector('.msg.mentor');
      await page.waitForTimeout(300);
      st.fail = true;
      await page.fill('#input', 'Which browsers should I test?');
      await page.click('#send');
      await page.waitForSelector('#log .err');
      check('AI lỗi → hiện thông báo', (await page.textContent('#log .err')).includes('bận'));
      check('AI lỗi → câu được trả lại ô nhập', (await page.inputValue('#input')) === 'Which browsers should I test?');
      let msgs = await page.evaluate(() => JSON.parse(localStorage.getItem('tagt:v1')).chat.messages);
      check('AI lỗi → lịch sử chỉ còn lượt mở đầu', msgs.length === 2, String(msgs.length));
      st.fail = false;
      st.slow = 1500;
      await page.click('#send');
      await page.waitForTimeout(300);
      await page.goto(URL + '#/today');
      await page.waitForTimeout(1800);
      msgs = await page.evaluate(() => JSON.parse(localStorage.getItem('tagt:v1')).chat.messages);
      const alt = msgs.every((m, i) => i === 0 || m.role !== msgs[i - 1].role);
      check('rời trang giữa chừng → lịch sử không hỏng', alt && msgs.at(-1).role === 'assistant', msgs.map((m) => m.role[0]).join(''));
      // Đổi tình huống khi AI đang trả lời → cuộc hội thoại mới không bị xoá nhầm.
      st.slow = 1200;
      await page.goto(URL + '#/chat');
      await page.waitForSelector('#input');
      await page.fill('#input', 'Is it for mobile too?');
      await page.click('#send');
      await page.waitForTimeout(200);
      st.slow = 0;
      await page.selectOption('#scenario', 'standup');
      await page.waitForTimeout(2000);
      msgs = await page.evaluate(() => JSON.parse(localStorage.getItem('tagt:v1')).chat);
      check('đổi tình huống giữa chừng → hội thoại mới còn nguyên', msgs.scenario === 'standup' && msgs.messages.length === 2 && msgs.messages[0].content === '[START]', msgs.messages.map((m) => m.role[0]).join(''));
      check('chat không lỗi JS', errors.length === 0, errors.join('; '));
      await ctx.close();
    }

    // 7. Mất mạng: đã mở app một lần → vẫn mở lại được khi offline.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await ctx.newPage();
      await page.goto(URL);
      await page.waitForSelector('.hero');
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await page.waitForSelector('.hero');
      await ctx.setOffline(true);
      let ok = false;
      try {
        await page.reload({ timeout: 8000 });
        await page.waitForSelector('.hero', { timeout: 5000 });
        ok = true;
      } catch {
        ok = false;
      }
      check('offline vẫn mở được app', ok);
      await ctx.close();
    }

    // 8. Không có key: các trang AI hiện hướng dẫn, không gọi mạng.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await ctx.newPage();
      const st = { calls: 0 };
      await mockAI(page, st);
      await page.goto(URL + '#/chat');
      await page.waitForSelector('main h1');
      check('không key: trang AI Mentor có nút thêm key', Boolean(await page.$('a[href="#/settings"].btn')));
      await page.goto(URL + '#/lesson/l04/roleplay');
      await page.fill('.roleplay[data-rp="0"] .rp-answer input', 'Can I upload a very big picture here?');
      await page.click('.roleplay[data-rp="0"] [data-eval]');
      await page.waitForTimeout(200);
      check('không key: câu khác mẫu → hướng dẫn tự so', (await page.textContent('.roleplay[data-rp="0"] .rp-eval')).includes('tự so sánh'));
      check('không key: không gọi AI lần nào', st.calls === 0);
      await ctx.close();
    }
    // 9. Luồng học chính: học xong 3 phần của bài 1 → bài hoàn thành, có thẻ cụm câu + thẻ luyện nghe.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await ctx.newPage();
      await page.goto(URL);
      await page.waitForSelector('.lesson-card');
      await page.click('.lesson-card');
      for (const sel of ['.dialogue', '.phrases', '.roleplay']) {
        await page.waitForSelector(sel);
        await page.click('#finish');
      }
      await page.waitForSelector('.hero');
      const st = await page.evaluate(() => JSON.parse(localStorage.getItem('tagt:v1')));
      check('học xong bài 1 → đánh dấu hoàn thành', Boolean(st.lessonDone.l01));
      const kinds = Object.keys(st.cards).map((k) => k[0]);
      check('có 8 thẻ cụm câu + 4 thẻ luyện nghe', kinds.filter((k) => k === 'p').length === 8 && kinds.filter((k) => k === 'd').length === 4, kinds.join(''));
      check('trang Hôm nay hiện 4/5 bước (ôn tập tự xong vì sáng nay chưa có thẻ)', (await page.textContent('[data-steps]')).trim() === '4/5');
      await ctx.close();
    }

    // 10. Cổng AI ở phần nhập vai: chỉ gọi AI khi câu khác mẫu và chưa chấm trước đó.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await ctx.newPage();
      const st = { calls: 0 };
      await mockAI(page, st);
      await seed(page, withKey);
      await page.goto(URL + '#/lesson/l09/roleplay');
      await page.waitForSelector('.roleplay');
      const answer = async (text) => {
        const c = page.locator('.roleplay[data-rp="0"]');
        await c.locator('.rp-answer input').fill(text);
        await c.locator('[data-eval]').click();
        await page.waitForTimeout(400);
      };
      await answer('yes ok');
      check('nhập vai: câu quá ngắn → không gọi AI', st.calls === 0);
      await answer('I might be wrong but based on the requirement document the error message should appear below the field could we check the document together');
      check('nhập vai: giống câu mẫu → không gọi AI', st.calls === 0);
      await answer('I think it is a bug because the document says something else');
      check('nhập vai: câu khác mẫu → gọi AI 1 lần', st.calls === 1);
      await answer('I think it is a bug because the document says something else');
      check('nhập vai: chấm lại đúng câu đó → dùng kết quả cũ', st.calls === 1);
      await ctx.close();
    }
    // 11. Claude (Anthropic SDK tải khi cần): kiểm tra kết nối chạy được, gửi đúng model và tham số.
    {
      const ctx = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await ctx.newPage();
      let body = null;
      await page.route('https://api.anthropic.com/**', async (route) => {
        body = JSON.parse(route.request().postData());
        const ev = (t, d) => `event: ${t}\ndata: ${JSON.stringify(d)}\n\n`;
        const msg = { id: 'm', type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } };
        const out =
          ev('message_start', { type: 'message_start', message: msg }) +
          ev('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }) +
          ev('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'OK' } }) +
          ev('content_block_stop', { type: 'content_block_stop', index: 0 }) +
          ev('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } }) +
          ev('message_stop', { type: 'message_stop' });
        await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/event-stream' }, body: out });
      });
      await seed(page, { settings: { provider: 'anthropic', keys: { anthropic: 'sk-ant-test' } }, cards: {}, days: {}, lessonDone: {} });
      await page.goto(URL + '#/settings');
      await page.waitForSelector('#testAI');
      await page.click('#testAI');
      await page.waitForFunction(() => !document.querySelector('#aiStatus').textContent.includes('Đang'));
      check('Claude: kiểm tra kết nối thành công', (await page.textContent('#aiStatus')).includes('Kết nối được'), await page.textContent('#aiStatus'));
      check('Claude: model mặc định + effort + fallback', body?.model === 'claude-opus-5-5' && body?.output_config?.effort === 'low' && body?.fallbacks === 'default');
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(results.join('\n'));
  console.log(`\n${results.length - failed}/${results.length} kiểm tra đạt`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
