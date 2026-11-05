// Chính sách dùng AI (xem docs/AI_POLICY.md). Hàm thuần: chỉ quyết định, không gọi mạng, không lưu trữ.
// Gọi AI ⇔ giá trị khi có AI > giá trị khi không có AI. Không giới hạn số lần, không tự hạ cấp model.
import { normText, wordCount, hasEnglishLetters, scoreSpeech } from './scoring.js';

export const PASS_SCORE = 80; // giống câu mẫu từ mức này: chấm cục bộ là đủ
export const MIN_WORDS = 3; // câu ngắn hơn: AI không có gì để chấm
export const HISTORY_TAIL = 24; // số lượt chat gần nhất gửi lên

// Chat tự do: giá trị cốt lõi của AI. Chỉ chặn đầu vào vô nghĩa hoặc gửi trùng.
export function decideChat(text, previousUserText) {
  if (text === '[START]') return { ok: true };
  if (!hasEnglishLetters(text)) return { ok: false, reason: 'Câu chưa có chữ tiếng Anh nào. Hãy nói hoặc gõ lại nhé.' };
  if (previousUserText && normText(previousUserText) === normText(text)) {
    return { ok: false, reason: 'Bạn vừa gửi đúng câu này rồi. Hãy thử diễn đạt khác hoặc trả lời ý tiếp theo.' };
  }
  return { ok: true };
}

// Trả lời có câu mẫu: giống mẫu thì chấm cục bộ; khác mẫu thì cần AI hiểu ý nghĩa.
export function decideAnswer(answer, sample) {
  const words = wordCount(answer);
  if (!words) return { mode: 'reject', msg: 'Không nghe thấy gì. Bấm micro và trả lời lại nhé.' };
  if (words < MIN_WORDS) return { mode: 'reject', msg: 'Câu hơi ngắn. Hãy trả lời bằng một câu đầy đủ (chủ ngữ + động từ).' };
  const { score } = scoreSpeech(sample, answer);
  if (score >= PASS_SCORE) return { mode: 'local', score, msg: `Rất sát câu mẫu (${score}%). Tốt lắm! Không cần AI chấm thêm.` };
  return { mode: 'ai', score };
}

// Sửa bài viết: trống thì bỏ qua; đã sửa đúng văn bản này thì dùng lại.
export function decideWriting(text, cachedResult) {
  if (!hasEnglishLetters(text)) return { mode: 'reject', msg: 'Hãy viết ít nhất một câu tiếng Anh nhé.' };
  if (cachedResult) return { mode: 'cached', value: cachedResult };
  return { mode: 'ai' };
}

// Rút gọn lịch sử: giữ lời mở đầu tình huống + các lượt gần nhất, luôn bắt đầu bằng lượt của người học.
export function trimHistory(messages, tail = HISTORY_TAIL) {
  if (messages.length <= tail + 2) return messages;
  const head = messages.slice(0, 2);
  let rest = messages.slice(-tail);
  while (rest.length && rest[0].role !== 'user') rest = rest.slice(1);
  return [...head, ...rest];
}

export const cacheKey = {
  writing: (text) => 'writing|' + normText(text),
  answer: (prompt, task, answer) => ['roleplay', prompt, task, normText(answer)].join('|'),
};

export const estimateTokens = (s) => Math.ceil((s || '').length / 4);
