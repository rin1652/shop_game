// "Cổng AI": quyết định KHI NÀO gọi AI.
// Nguyên tắc: hiệu quả học là ưu tiên số 1 và không tiếc tiền, nhưng KHÔNG gọi AI khi kết quả
// không tốt hơn cách làm không dùng AI (chấm cục bộ, bộ nhớ đệm, câu mẫu có sẵn).
// Sơ đồ quyết định: docs/AI_POLICY.md
import { getState, getDay, save } from './storage.js';
import { scoreSpeech } from './speech.js';

const CACHE_MAX = 300;

// ---- Thống kê sử dụng (để minh bạch, không dùng để chặn) ----
const estTokens = (s) => Math.ceil((s || '').length / 4);

function usage() {
  const day = getDay();
  day.ai ||= { calls: 0, inTok: 0, outTok: 0, avoided: 0, cached: 0 };
  return day.ai;
}

export function recordCall(inputText, outputText) {
  const u = usage();
  u.calls += 1;
  u.inTok += estTokens(inputText);
  u.outTok += estTokens(outputText);
  save();
}

export function recordAvoided(kind = 'avoided') {
  const u = usage();
  u[kind === 'cached' ? 'cached' : 'avoided'] += 1;
  save();
}

export const todayUsage = () => ({ ...usage() });

// ---- Bộ nhớ đệm: cùng một đầu vào → cùng câu trả lời, không gọi lại ----
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + str.length;
}

export const normText = (s) => (s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function cacheGet(kind, input) {
  const c = getState().aiCache?.[hash(kind + '|' + input)];
  return c ? c.v : null;
}

export function cacheSet(kind, input, value) {
  const s = getState();
  s.aiCache ||= {};
  s.aiCache[hash(kind + '|' + input)] = { v: value, t: Date.now() };
  const keys = Object.keys(s.aiCache);
  if (keys.length > CACHE_MAX) {
    keys.sort((a, b) => s.aiCache[a].t - s.aiCache[b].t).slice(0, keys.length - CACHE_MAX).forEach((k) => delete s.aiCache[k]);
  }
  save();
}

// ---- Quyết định cho từng loại yêu cầu ----

const wordCount = (s) => normText(s).split(' ').filter(Boolean).length;

// Chat với AI mentor: hội thoại tự do là giá trị cốt lõi của AI, nên chỉ chặn đầu vào vô nghĩa
// hoặc gửi trùng, những trường hợp AI không thể giúp gì thêm.
export function gateChat(text, previousUserText) {
  if (text === '[START]') return { ok: true };
  if (!/[a-zA-Z]/.test(text)) return { ok: false, reason: 'Câu chưa có chữ tiếng Anh nào. Hãy nói hoặc gõ lại nhé.' };
  if (previousUserText && normText(previousUserText) === normText(text)) {
    return { ok: false, reason: 'Bạn vừa gửi đúng câu này rồi. Hãy thử diễn đạt khác hoặc trả lời ý tiếp theo.' };
  }
  return { ok: true };
}

// Nhập vai có câu mẫu: chấm cục bộ trước; chỉ gọi AI khi câu trả lời khác câu mẫu
// (máy không tự đánh giá được ý nghĩa và ngữ pháp của câu khác mẫu, còn AI thì làm được).
export function gateRoleplay(answer, sample) {
  const words = wordCount(answer);
  if (!words) return { mode: 'reject', msg: 'Không nghe thấy gì. Bấm micro và trả lời lại nhé.' };
  if (words < 3) return { mode: 'reject', msg: 'Câu hơi ngắn. Hãy trả lời bằng một câu đầy đủ (chủ ngữ + động từ).' };
  const { score } = scoreSpeech(sample, answer);
  if (score >= 80) return { mode: 'local', score, msg: `Rất sát câu mẫu (${score}%). Tốt lắm! Không cần AI chấm thêm.` };
  return { mode: 'ai', score };
}

// Sửa bài viết: bỏ qua nếu trống; dùng lại kết quả nếu đã sửa đúng văn bản này.
export function gateWriting(text) {
  if (!/[a-zA-Z]/.test(text || '')) return { mode: 'reject', msg: 'Hãy viết ít nhất một câu tiếng Anh nhé.' };
  const cached = cacheGet('writing', normText(text));
  if (cached) return { mode: 'cached', value: cached };
  return { mode: 'ai' };
}

// Rút gọn lịch sử chat gửi lên: giữ phần mở đầu (bối cảnh tình huống) và các lượt gần nhất.
// Lượt cũ ở giữa ít ảnh hưởng tới câu trả lời tiếp theo nhưng bị tính tiền mỗi lần gửi.
export function trimHistory(messages, tail = 24) {
  if (messages.length <= tail + 2) return messages;
  const head = messages.slice(0, 2); // [START] + lời mở đầu của mentor
  let rest = messages.slice(-tail);
  while (rest.length && rest[0].role !== 'user') rest = rest.slice(1);
  return [...head, ...rest];
}
