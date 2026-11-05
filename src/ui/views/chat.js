import { SCENARIOS, hasAI, aiConfig, chatSession, startChat, sendToMentor, splitReply } from '../../application/coach.js';
import { completeStep } from '../../application/progress.js';
import { settings, updateSettings } from '../../application/preferences.js';
import { lessonById } from '../../domain/curriculum.js';
import { speak, stopSpeaking, listen, stopListening, canListen } from '../../infrastructure/speech.js';
import { esc, icon, toast, page } from '../components.js';

export function renderChat(el, query) {
  if (!hasAI()) {
    el.innerHTML = `
      ${page({ title: 'AI Mentor' })}
      <div class="card">
        <p>Luyện nói chuyện tự do với <b>Rahul</b>, một QA Lead người Ấn Độ do AI đóng vai. Rahul hỏi về module self-healing, giao requirement mơ hồ, đôi khi phản bác bạn, và sau mỗi câu góp ý bằng tiếng Việt.</p>
        <p class="secondary">Cần API key của một nhà cung cấp AI: Anthropic (Claude), OpenAI (ChatGPT), Google Gemini (có gói miễn phí), OpenRouter hoặc dịch vụ tương thích OpenAI. Key chỉ lưu trong trình duyệt của bạn.</p>
        <a class="btn filled" href="#/settings" style="margin-top:8px">Thêm API key</a>
      </div>
      <p class="section-footer">Chưa có key? Bạn vẫn luyện được với phần <a href="#/lessons">Nhập vai</a> có sẵn trong mỗi bài.</p>`;
    return;
  }

  if (query.get('lesson') && chatSession().lessonId !== query.get('lesson')) startChat({ lessonId: query.get('lesson') });
  const session = chatSession();
  const scenario = SCENARIOS.find((x) => x.id === session.scenario) || SCENARIOS[0];
  const lesson = session.lessonId ? lessonById(session.lessonId) : null;
  const cfg = aiConfig();
  let controller = null;

  el.innerHTML = `
    ${page({ title: 'AI Mentor', subtitle: `${esc(cfg.label)} · <code>${esc(cfg.model)}</code> · <a href="#/settings">đổi</a>` })}
    <div class="group">
      <label class="row"><span class="body"><span class="title">Tình huống</span></span>
        <select id="scenario" aria-label="Tình huống">${SCENARIOS.map((x) => `<option value="${x.id}" ${x.id === scenario.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>
      <label class="row"><span class="body"><span class="title">Tự đọc lời mentor</span></span><input type="checkbox" class="switch" id="autoSpeak" ${settings().autoSpeak ? 'checked' : ''}></label>
    </div>
    <p class="section-footer">${esc(scenario.brief)}${lesson ? ` Chủ đề bài: <b>${esc(lesson.titleEn)}</b> · <a href="#" id="clearLesson">bỏ</a>` : ''}</p>
    <div class="chat" id="log" aria-live="polite"></div>
    <div class="composer">
      <button class="round" id="mic" aria-label="Nói">${icon('mic', 20)}</button>
      <textarea id="input" rows="1" placeholder="Nhắn bằng tiếng Anh…" aria-label="Câu trả lời"></textarea>
      <button class="round send" id="send" aria-label="Gửi">${icon('send', 20)}</button>
    </div>
    <div class="ctrl"><button class="btn small" id="restart">Bắt đầu lại</button></div>
  `;

  const log = el.querySelector('#log');
  const input = el.querySelector('#input');

  const bubble = (m) => {
    if (m.role === 'user') return m.content === '[START]' ? '' : `<div class="bubble me"><div class="en">${esc(m.content)}</div></div>`;
    const { reply, notes } = splitReply(m.content);
    return `<div class="bubble them msg mentor"><div class="who">Rahul</div><div class="en">${esc(reply || '…')}</div>
      <div class="ctrl"><button class="pill" data-speak="${esc(reply)}" data-kind="mentor">${icon('play', 14)}<span>Nghe</span></button>
      <button class="pill" data-speak="${esc(reply)}" data-kind="mentor" data-slow="1"><span>Chậm</span></button></div></div>
      ${notes ? `<div class="callout notes">${esc(notes)}</div>` : ''}`;
  };
  const draw = (pending) => {
    log.innerHTML = chatSession().messages.map(bubble).join('') + (pending != null ? bubble({ role: 'assistant', content: pending }) : '');
    window.scrollTo({ top: document.body.scrollHeight });
  };

  const send = async (text) => {
    if (controller) return;
    const ctrl = (controller = new AbortController());
    try {
      const r = await sendToMentor(text, { signal: ctrl.signal, onText: (t) => !ctrl.signal.aborted && draw(t) });
      if (!r.ok) {
        draw();
        toast(r.reason);
        input.value = text;
        return;
      }
      if (ctrl.signal.aborted) return;
      draw();
      if (r.reply) {
        if (lesson && chatSession().messages.filter((m) => m.role === 'user').length >= 6) completeStep('roleplay', lesson.id);
        if (settings().autoSpeak) speak(splitReply(r.reply).reply, { kind: 'mentor' });
      }
    } catch (err) {
      if (ctrl.signal.aborted) return;
      draw();
      log.insertAdjacentHTML('beforeend', `<div class="err">${esc(err.message)}</div>`);
      if (text !== '[START]') input.value = text;
    } finally {
      if (controller === ctrl) controller = null;
    }
  };

  // Đang chờ phản hồi đầu tiên: hiện bong bóng "…" ngay để có phản hồi tức thì.
  const sendWithPlaceholder = (text) => {
    if (controller) return;
    if (text !== '[START]') log.insertAdjacentHTML('beforeend', `<div class="bubble me"><div class="en">${esc(text)}</div></div>`);
    log.insertAdjacentHTML('beforeend', bubble({ role: 'assistant', content: '' }));
    send(text);
  };

  el.querySelector('#send').onclick = () => {
    const t = input.value.trim();
    if (!t) return;
    input.value = '';
    stopSpeaking();
    sendWithPlaceholder(t);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el.querySelector('#send').click();
    }
  });
  const mic = el.querySelector('#mic');
  let listening = false;
  mic.onclick = async () => {
    if (!canListen) return toast('Trình duyệt này không nhận giọng nói. Hãy gõ câu trả lời.');
    if (listening) return stopListening();
    listening = true;
    mic.classList.add('on');
    const before = input.value ? input.value.trim() + ' ' : '';
    try {
      const said = await listen({ onInterim: (t) => (input.value = before + t) });
      input.value = (before + said).trim();
    } catch (err) {
      toast(err.message);
    } finally {
      listening = false;
      mic.classList.remove('on');
    }
  };
  const restartWith = (patch) => {
    controller?.abort();
    controller = null;
    startChat(patch);
    renderChat(el, new URLSearchParams());
  };
  el.querySelector('#scenario').onchange = (e) => restartWith({ scenarioId: e.target.value });
  el.querySelector('#restart').onclick = () => restartWith({});
  el.querySelector('#clearLesson')?.addEventListener('click', (e) => {
    e.preventDefault();
    restartWith({ lessonId: null });
  });
  el.querySelector('#autoSpeak').onchange = (e) => updateSettings({ autoSpeak: e.target.checked });

  draw();
  if (!chatSession().messages.length) sendWithPlaceholder('[START]');
  return () => controller?.abort();
}
