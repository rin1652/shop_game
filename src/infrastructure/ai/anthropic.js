// Adapter Claude (Anthropic) qua SDK chính thức, chạy trên trình duyệt với key của người học.
// SDK chỉ được tải khi thật sự dùng Claude, để app mở nhanh trên điện thoại.
import { ProviderError } from './rest.js';

let Anthropic = null;
async function client(key) {
  Anthropic ||= (await import('@anthropic-ai/sdk')).default;
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

function message(err) {
  if (!Anthropic) return 'Lỗi: ' + (err?.message || String(err));
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

export async function anthropicChat({ key, model, system, messages, onText, signal }) {
  // cache_control: phần đầu prompt lặp lại giữa các lượt được tính giá rẻ hơn, chất lượng không đổi.
  const params = { model, max_tokens: 16000, system, messages, cache_control: { type: 'ephemeral' } };
  if (EFFORT_MODELS.has(model)) params.output_config = { effort: 'low' }; // trả lời ngắn, không cần suy nghĩ sâu
  if (FALLBACK_MODELS.has(model)) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  try {
    const stream = (await client(key)).beta.messages.stream(params, { signal });
    let text = '';
    stream.on('text', (delta) => {
      text += delta;
      onText?.(text);
    });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new ProviderError('AI từ chối trả lời yêu cầu này. Hãy thử diễn đạt khác.');
    return text;
  } catch (err) {
    if (Anthropic && err instanceof Anthropic.APIUserAbortError) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(message(err));
  }
}

export async function anthropicModels(key) {
  try {
    const page = await (await client(key)).models.list({ limit: 100 });
    return page.data.map((m) => ({ id: m.id, label: m.display_name || '' }));
  } catch (err) {
    throw new ProviderError(message(err));
  }
}
