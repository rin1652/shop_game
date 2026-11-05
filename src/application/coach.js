// Use case: AI coach — chat với mentor, chấm câu trả lời, sửa bài viết. Mọi lời gọi AI đi qua chính sách
// ở domain/aiPolicy.js: chỉ gọi khi AI làm tốt hơn cách không dùng AI.
import { state, persist, ai } from './ports.js';
import { recordCall, recordAvoided, cacheGet, cacheSet } from './usage.js';
import { decideChat, decideAnswer, decideWriting, trimHistory, cacheKey } from '../domain/aiPolicy.js';
import { SCENARIOS } from '../data/scenarios.js';
import { lessonById } from '../domain/curriculum.js';

export { SCENARIOS };

export function aiConfig() {
  const s = state().settings;
  const providers = ai().providers;
  const provider = providers[s.provider] ? s.provider : 'anthropic';
  return {
    provider,
    key: (s.keys?.[provider] || '').trim(),
    model: (s.models?.[provider] || providers[provider].defaultModel || '').trim(),
    baseUrl: (s.customBaseUrl || '').trim(),
    label: providers[provider].label,
  };
}

export const hasAI = () => {
  const c = aiConfig();
  return Boolean(c.key && c.model);
};

async function callAI(request) {
  const c = aiConfig();
  if (!c.key) throw new Error('Chưa nhập API key cho ' + c.label + '. Vào Cài đặt để thêm.');
  if (!c.model) throw new Error('Chưa chọn model. Vào Cài đặt để chọn.');
  const out = await ai().chat(c, request);
  if (out) recordCall(request.system + request.messages.map((m) => m.content).join('\n'), out);
  return out;
}

// ---- Chat với mentor ----
export function mentorPrompt(scenario, lesson) {
  return `You are Rahul, a friendly but busy QA Lead from Bangalore, India, working in an IT services company. You are mentoring a Vietnamese QA intern on a video call. The intern's English is basic (around A2), and their goal is to understand your requirements quickly and to push back politely when needed. This is a speaking practice; the intern's messages often come from speech recognition, so ignore missing punctuation and capital letters.

How you speak, in character:
- Use simple, clear English and short turns of 1 to 3 sentences, like real speech on a call.
- Sound like a real Indian IT professional: now and then use common Indian English expressions such as "do the needful", "revert", "today itself", "kindly", "prepone", "no?" or "na?" at the end of a question, "do one thing", "I have a doubt". Use at most one or two per turn so they stay natural.
- Stay on the scenario and keep the conversation moving with one question or request at a time.
- If the intern seems lost, rephrase more simply instead of switching to Vietnamese.

Scenario: ${scenario.prompt}${lesson ? `\nToday's lesson topic is "${lesson.titleEn}"; give the intern chances to use phrases such as: ${lesson.phrases.map((p) => `"${p.en}"`).join(', ')}.` : ''}

After your in-character reply, write a line containing only ### and then short coaching notes in Vietnamese about the intern's LAST message, using exactly this format:
✔️ Sửa: <the intern's sentence corrected, or "Câu của bạn ổn." if it was fine>
💬 Tự nhiên hơn: <a more natural way a QA engineer would say it>
💡 <one short practical tip in Vietnamese, e.g. a phrase to use next or what to ask next>

When the user message is exactly [START], open the scenario in character and write no coaching section.`;
}

export const splitReply = (text) => {
  const i = text.indexOf('###');
  return i === -1 ? { reply: text.trim(), notes: '' } : { reply: text.slice(0, i).trim(), notes: text.slice(i + 3).trim() };
};

export function chatSession() {
  return state().chat;
}

export function startChat({ scenarioId, lessonId } = {}) {
  const s = state();
  s.chat = {
    scenario: SCENARIOS.some((x) => x.id === scenarioId) ? scenarioId : s.chat.scenario,
    lessonId: lessonId === undefined ? s.chat.lessonId : lessonId,
    messages: [],
  };
  persist();
  return s.chat;
}

// Gửi một lượt. Trả về { ok:false, reason } nếu chính sách chặn; ngược lại { ok:true, reply } ('' nếu bị huỷ).
// Chỉ ghi vào đúng cuộc hội thoại đang mở lúc gửi: đổi tình huống giữa chừng không làm hỏng cuộc mới.
export async function sendToMentor(text, { onText, signal } = {}) {
  const session = state().chat;
  const thread = session.messages;
  const lastUser = [...thread].reverse().find((m) => m.role === 'user' && m.content !== '[START]');
  const decision = decideChat(text, lastUser?.content);
  if (!decision.ok) {
    recordAvoided();
    return { ok: false, reason: decision.reason };
  }
  const scenario = SCENARIOS.find((x) => x.id === session.scenario) || SCENARIOS[0];
  const lesson = session.lessonId ? lessonById(session.lessonId) : null;
  const userMsg = { role: 'user', content: text };
  const undo = () => {
    const i = thread.lastIndexOf(userMsg);
    if (i !== -1) thread.splice(i, 1);
    persist();
  };
  thread.push(userMsg);
  persist();
  try {
    const reply = await callAI({ system: mentorPrompt(scenario, lesson), messages: trimHistory(thread), onText, signal });
    if (!reply || signal?.aborted) {
      undo();
      return { ok: true, reply: '' };
    }
    thread.push({ role: 'assistant', content: reply });
    persist();
    return { ok: true, reply };
  } catch (err) {
    undo();
    if (signal?.aborted) return { ok: true, reply: '' };
    throw err;
  }
}

// ---- Chấm câu trả lời có câu mẫu (nhập vai, bài kiểm tra) ----
// Kết quả: { mode: 'reject'|'local'|'nokey'|'cached'|'ai', msg?, text?, score? }
export async function evaluateAnswer({ prompt, task, sample, answer }, { onText } = {}) {
  const d = decideAnswer(answer, sample);
  if (d.mode === 'reject') return d;
  if (d.mode === 'local') {
    recordAvoided();
    return d;
  }
  if (!hasAI()) return { mode: 'nokey', score: d.score };
  const key = cacheKey.answer(prompt, task, answer);
  const cached = cacheGet(key);
  if (cached) {
    recordAvoided('cached');
    onText?.(cached);
    return { mode: 'cached', text: cached, score: d.score };
  }
  const text = await callAI({
    onText,
    system:
      'You coach a Vietnamese QA intern (basic English) who practises answering an Indian QA mentor. Judge whether the answer does the task and would be understood at work. The model answer is only one possible answer; different wording is fine. Reply in Vietnamese, at most 4 short lines, using exactly this format:\n✅ Đạt / ⚠️ Gần đạt / ❌ Chưa đạt: <one-sentence reason>\n✔️ Sửa: <the answer corrected, or "Câu của bạn ổn.">\n💬 Tự nhiên hơn: <a natural workplace version>\n💡 <one short tip>',
    messages: [{ role: 'user', content: `Mentor said: "${prompt}"\nTask (Vietnamese): ${task}\nModel answer: "${sample}"\nIntern answered (from speech recognition, ignore punctuation): "${answer}"` }],
  });
  if (text) cacheSet(key, text);
  return { mode: 'ai', text, score: d.score };
}

// ---- Sửa bài viết ----
export async function correctWriting(text, { onText } = {}) {
  const key = cacheKey.writing(text);
  const d = decideWriting(text, cacheGet(key));
  if (d.mode === 'reject') return d;
  if (d.mode === 'cached') {
    recordAvoided('cached');
    return d;
  }
  const value = await callAI({
    onText,
    system:
      'You are an English writing coach for a Vietnamese QA intern with basic English. Correct their short standup-style text. Reply in Vietnamese with: (1) the corrected English text, (2) a short bullet list of the main mistakes with simple explanations, (3) one more natural version a QA engineer would say in a standup. Keep it concise.',
    messages: [{ role: 'user', content: text }],
  });
  if (value) cacheSet(key, value);
  return { mode: 'ai', value };
}

// ---- Cài đặt AI ----
export async function testConnection() {
  return callAI({ system: 'You are a connection test. Reply with exactly one word: OK', messages: [{ role: 'user', content: 'Say OK' }] });
}

export async function loadModelList(provider) {
  const s = state().settings;
  const key = (s.keys?.[provider] || '').trim();
  if (!key) throw new Error('Nhập API key trước đã.');
  const list = await ai().listModels({ provider, key, baseUrl: s.customBaseUrl });
  s.modelLists ||= {};
  s.modelLists[provider] = list;
  if (!s.models[provider] && list.length) s.models[provider] = list[0].id;
  persist();
  return list;
}
