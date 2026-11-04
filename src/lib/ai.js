// AI mentor: hỗ trợ nhiều nhà cung cấp. API key do bạn nhập, chỉ lưu trong trình duyệt của bạn.
import Anthropic from '@anthropic-ai/sdk';
import { getState } from './storage.js';
import { PROVIDERS, ProviderError, openaiCompatChat, geminiChat, listRemoteModels } from './providers.js';

export { PROVIDERS };

export function currentAI() {
  const s = getState().settings;
  const provider = PROVIDERS[s.provider] ? s.provider : 'anthropic';
  const key = (s.keys?.[provider] || '').trim();
  const model = (s.models?.[provider] || PROVIDERS[provider].defaultModel || '').trim();
  return { provider, key, model, settings: s };
}

export const hasKey = () => {
  const { key, model } = currentAI();
  return Boolean(key && model);
};

function anthropicClient(key) {
  return new Anthropic({
    apiKey: key,
    // App cá nhân chạy hoàn toàn trên trình duyệt: key chỉ nằm trên máy bạn.
    dangerouslyAllowBrowser: true,
  });
}

function anthropicError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'API key không đúng hoặc đã bị thu hồi. Kiểm tra lại trong Cài đặt.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'API key không có quyền dùng model này.';
  if (err instanceof Anthropic.NotFoundError) return 'Không tìm thấy model. Hãy chọn model khác trong Cài đặt.';
  if (err instanceof Anthropic.RateLimitError) return 'Gửi quá nhanh hoặc hết hạn mức. Đợi một chút rồi thử lại.';
  if (err instanceof Anthropic.InternalServerError) return 'Máy chủ AI đang bận. Thử lại sau ít phút.';
  if (err instanceof Anthropic.APIConnectionError) return 'Không kết nối được tới máy chủ AI. Kiểm tra mạng.';
  if (err instanceof Anthropic.BadRequestError) return 'Yêu cầu không hợp lệ: ' + (err.message || '');
  if (err instanceof Anthropic.APIError) return 'Lỗi AI: ' + (err.message || err.status);
  return 'Lỗi: ' + (err?.message || String(err));
}

// Model Claude hỗ trợ tham số effort và fallback phía server.
const EFFORT_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5', 'claude-fable-5-1']);
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-opus-5', 'claude-fable-5-1']);

async function anthropicChat({ key, model, system, messages, onText, signal }) {
  const params = { model, max_tokens: 16000, system, messages };
  if (EFFORT_MODELS.has(model)) params.output_config = { effort: 'low' }; // trò chuyện ngắn — không cần suy nghĩ sâu
  if (FALLBACK_MODELS.has(model)) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  try {
    const stream = anthropicClient(key).beta.messages.stream(params, { signal });
    let text = '';
    stream.on('text', (delta) => {
      text += delta;
      onText?.(text);
    });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new ProviderError('AI từ chối trả lời yêu cầu này. Hãy thử diễn đạt khác.');
    return text;
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(anthropicError(err));
  }
}

// Gửi hội thoại, stream chữ trả về qua onText. Trả về toàn bộ văn bản ('' nếu bị huỷ).
export async function chat({ system, messages, onText, signal, override }) {
  const ai = { ...currentAI(), ...override };
  if (!ai.key) throw new Error('Chưa nhập API key cho ' + PROVIDERS[ai.provider].label + '. Vào Cài đặt để thêm.');
  if (!ai.model) throw new Error('Chưa chọn model. Vào Cài đặt để chọn.');
  const args = { ...ai, system, messages, onText, signal };
  try {
    if (ai.provider === 'anthropic') return await anthropicChat(args);
    if (ai.provider === 'gemini') return await geminiChat(args);
    return await openaiCompatChat(args);
  } catch (err) {
    if (err?.name === 'AbortError') return '';
    throw new Error(err instanceof ProviderError ? err.message : 'Lỗi: ' + (err?.message || String(err)));
  }
}

// Danh sách model lấy trực tiếp từ nhà cung cấp.
export async function listModels(provider) {
  const s = getState().settings;
  const key = (s.keys?.[provider] || '').trim();
  if (!key) throw new Error('Nhập API key trước đã.');
  try {
    if (provider === 'anthropic') {
      const page = await anthropicClient(key).models.list({ limit: 100 });
      return page.data.map((m) => ({ id: m.id, label: m.display_name || '' }));
    }
    return await listRemoteModels(provider, s, key);
  } catch (err) {
    throw new Error(err instanceof ProviderError ? err.message : provider === 'anthropic' ? anthropicError(err) : err.message);
  }
}

export const SCENARIOS = [
  {
    id: 'requirement',
    title: 'Mentor giao requirement mơ hồ',
    brief: 'Mentor giao một tính năng cần test nhưng cố tình nói thiếu thông tin. Bạn phải hỏi làm rõ, diễn giải lại để xác nhận.',
    prompt:
      'Give the intern a new feature to test (pick a realistic e-commerce or banking feature). Describe it vaguely and leave out key details (limits, error handling, platforms, deadline). Only reveal a detail when the intern asks a good clarifying question. When the intern paraphrases correctly, confirm it.',
  },
  {
    id: 'standup',
    title: 'Daily standup',
    brief: 'Bạn báo cáo standup: hôm qua, hôm nay, vướng mắc. Mentor sẽ hỏi thêm chi tiết.',
    prompt:
      'Run a short daily standup. Ask the intern for their update (yesterday, today, blockers), then ask one or two follow-up questions about details such as bug IDs, percent complete or ETA.',
  },
  {
    id: 'bug',
    title: 'Báo bug & tranh luận severity',
    brief: 'Bạn báo một bug. Mentor cho rằng bug nhỏ và muốn dời sang sprint sau. Bạn phải bảo vệ quan điểm bằng tác động lên người dùng.',
    prompt:
      'The intern will report a bug. Ask for steps to reproduce, expected vs actual result and environment. Then politely push back, saying it looks minor and could move to the next sprint. Only agree when the intern gives a clear reason based on user or business impact.',
  },
  {
    id: 'pushback',
    title: 'Mentor đưa yêu cầu không hợp lý',
    brief: 'Mentor bảo bỏ qua regression, hoặc đánh dấu pass khi chưa test, hoặc ôm thêm việc. Bạn phản biện lịch sự và đề xuất phương án.',
    prompt:
      'Make one questionable request under time pressure, for example skipping regression, marking untested cases as passed, or adding more scope with the same deadline. Insist a little. Accept a polite alternative proposal if the intern explains the risk clearly.',
  },
  {
    id: 'deadline',
    title: 'Ước lượng & deadline',
    brief: 'Mentor hỏi ETA và muốn xong sớm hơn. Bạn đưa ước lượng có lý do và thương lượng ưu tiên.',
    prompt:
      'Ask the intern for an estimate (ETA) for testing a feature, then say the client needs it sooner. Expect the intern to explain the estimate and negotiate priorities or scope.',
  },
  {
    id: 'free',
    title: 'Nói chuyện tự do',
    brief: 'Trò chuyện tự do với mentor về công việc, dự án, học QA.',
    prompt: 'Have a friendly, work-related chat. Ask the intern about their QA learning, what they found difficult this week and give simple advice.',
  },
];

export function mentorSystemPrompt(scenario, lesson) {
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

export async function correctWriting(text, onText) {
  return chat({
    onText,
    system:
      'You are an English writing coach for a Vietnamese QA intern with basic English. Correct their short standup-style text. Reply in Vietnamese with: (1) the corrected English text, (2) a short bullet list of the main mistakes with simple explanations, (3) one more natural version a QA engineer would say in a standup. Keep it concise.',
    messages: [{ role: 'user', content: text }],
  });
}
