import { SCENARIOS, mentorSystemPrompt, chat, hasKey } from '../lib/ai.js';
import { lessonById } from '../data/lessons.js';
import { getState, save } from '../lib/storage.js';
import { speak, stopSpeaking, listen, stopListening, canListen } from '../lib/speech.js';
import { esc, icon, toast } from '../lib/ui.js';
import { markStep } from './today.js';

const split = (text) => {
  const i = text.indexOf('###');
  return i === -1 ? { reply: text.trim(), notes: '' } : { reply: text.slice(0, i).trim(), notes: text.slice(i + 3).trim() };
};

export function renderChat(el, query) {
  if (!hasKey()) {
    el.innerHTML = `
      <h1>AI Mentor</h1>
      <div class="card">
        <p>Luyện nói chuyện tự do với <b>Rahul</b>, một QA Lead người Ấn Độ do AI đóng vai. Rahul sẽ giao requirement mơ hồ, đôi khi phản bác bạn, và sau mỗi câu sẽ góp ý bằng tiếng Việt.</p>
        <p class="muted">Cần Claude API key (lấy ở console.anthropic.com). Key chỉ lưu trong trình duyệt của bạn.</p>
        <a class="btn" href="#/settings">Thêm API key</a>
      </div>
      <p class="muted small">Chưa có key? Bạn vẫn luyện được với phần <a href="#/lessons">Nhập vai</a> có sẵn trong mỗi bài.</p>`;
    return;
  }

  const s = getState();
  const lesson = query.get('lesson') ? lessonById(query.get('lesson')) : null;
  if (lesson && s.chat.lessonId !== lesson.id) {
    s.chat = { scenario: s.chat.scenario, lessonId: lesson.id, messages: [] };
    save();
  }
  const scenario = SCENARIOS.find((x) => x.id === s.chat.scenario) || SCENARIOS[0];
  const activeLesson = s.chat.lessonId ? lessonById(s.chat.lessonId) : null;
  let controller = null;

  el.innerHTML = `
    <h1>AI Mentor</h1>
    <label class="field">Tình huống
      <select id="scenario">${SCENARIOS.map((x) => `<option value="${x.id}" ${x.id === scenario.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>
    </label>
    <p class="muted small">${esc(scenario.brief)}${activeLesson ? ` Chủ đề bài: <b>${esc(activeLesson.titleEn)}</b> <a href="#" id="clearLesson">(bỏ)</a>` : ''}</p>
    <div class="chat" id="log"></div>
    <div class="composer">
      <button class="btn-icon mic big" id="mic" title="Nói">${icon('mic', 22)}</button>
      <textarea id="input" rows="1" placeholder="Nói hoặc gõ câu trả lời bằng tiếng Anh…"></textarea>
      <button class="btn-icon big" id="send" title="Gửi">${icon('send', 20)}</button>
    </div>
    <div class="row">
      <button class="btn ghost small" id="restart">Bắt đầu lại</button>
      <label class="toggle"><input type="checkbox" id="autoSpeak" ${s.settings.autoSpeak ? 'checked' : ''}> Tự đọc lời mentor</label>
    </div>
  `;

  const log = el.querySelector('#log');
  const input = el.querySelector('#input');

  const bubble = (m) => {
    if (m.role === 'user') {
      if (m.content === '[START]') return '';
      return `<div class="msg me"><div class="en">${esc(m.content)}</div></div>`;
    }
    const { reply, notes } = split(m.content);
    return `<div class="msg mentor"><div class="who">Rahul</div><div class="en">${esc(reply)}</div>
      <div class="ctrl"><button class="btn-icon" data-speak="${esc(reply)}" data-kind="mentor">${icon('play', 16)}</button>
      <button class="btn-icon" data-speak="${esc(reply)}" data-kind="mentor" data-slow="1">${icon('slow', 16)}</button></div></div>
      ${notes ? `<div class="notes">${esc(notes)}</div>` : ''}`;
  };

  const draw = (pending) => {
    log.innerHTML = s.chat.messages.map(bubble).join('') + (pending != null ? bubble({ role: 'assistant', content: pending || '…' }) : '');
    log.scrollTop = log.scrollHeight;
    window.scrollTo({ top: document.body.scrollHeight });
  };

  const send = async (text) => {
    if (controller) return;
    s.chat.messages.push({ role: 'user', content: text });
    save();
    draw('');
    controller = new AbortController();
    try {
      const full = await chat({
        system: mentorSystemPrompt(scenario, activeLesson),
        messages: s.chat.messages,
        onText: (t) => draw(t),
        signal: controller.signal,
      });
      if (!full) {
        s.chat.messages.pop();
        draw();
        return;
      }
      s.chat.messages.push({ role: 'assistant', content: full });
      save();
      draw();
      if (s.chat.messages.filter((m) => m.role === 'user').length >= 6 && activeLesson) markStep('roleplay', activeLesson.id);
      if (s.settings.autoSpeak) speak(split(full).reply, { kind: 'mentor' });
    } catch (err) {
      s.chat.messages.pop();
      draw();
      log.insertAdjacentHTML('beforeend', `<div class="err">${esc(err.message)}</div>`);
      if (text !== '[START]') input.value = text;
    } finally {
      controller = null;
    }
  };

  el.querySelector('#send').onclick = () => {
    const t = input.value.trim();
    if (!t) return;
    input.value = '';
    stopSpeaking();
    send(t);
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

  el.querySelector('#scenario').onchange = (e) => {
    controller?.abort();
    s.chat = { scenario: e.target.value, lessonId: s.chat.lessonId, messages: [] };
    save();
    renderChat(el, new URLSearchParams());
  };
  el.querySelector('#restart').onclick = () => {
    controller?.abort();
    s.chat.messages = [];
    save();
    renderChat(el, new URLSearchParams());
  };
  el.querySelector('#clearLesson')?.addEventListener('click', (e) => {
    e.preventDefault();
    s.chat = { scenario: s.chat.scenario, lessonId: null, messages: [] };
    save();
    location.hash = '#/chat';
  });
  el.querySelector('#autoSpeak').onchange = (e) => {
    s.settings.autoSpeak = e.target.checked;
    save();
  };

  draw();
  if (!s.chat.messages.length) send('[START]');
  return () => controller?.abort();
}
