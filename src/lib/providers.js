// Nhà cung cấp AI khác ngoài Anthropic: gọi thẳng REST API từ trình duyệt (key do bạn nhập).

export const PROVIDERS = {
  anthropic: {
    label: 'Anthropic (Claude)',
    keyHint: 'sk-ant-… · tạo ở console.anthropic.com',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-opus-5-5',
    suggestions: [
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (tốt nhất)' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (rẻ hơn)' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (rẻ nhất)' },
    ],
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    keyHint: 'sk-… · tạo ở platform.openai.com',
    keyUrl: 'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: '',
    suggestions: [],
  },
  gemini: {
    label: 'Google Gemini',
    keyHint: 'AIza… · tạo miễn phí ở aistudio.google.com',
    keyUrl: 'https://aistudio.google.com/apikey',
    defaultModel: '',
    suggestions: [],
  },
  openrouter: {
    label: 'OpenRouter (nhiều model)',
    keyHint: 'sk-or-… · tạo ở openrouter.ai',
    keyUrl: 'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: '',
    suggestions: [],
  },
  custom: {
    label: 'Tuỳ chỉnh (tương thích OpenAI)',
    keyHint: 'Key của dịch vụ bạn dùng',
    defaultModel: '',
    suggestions: [],
  },
};

export class ProviderError extends Error {}

function statusMessage(status, detail) {
  if (status === 401 || status === 403) return 'API key không đúng, hết hạn hoặc không có quyền. Kiểm tra lại trong Cài đặt.';
  if (status === 404) return 'Không tìm thấy model hoặc địa chỉ API. Kiểm tra tên model trong Cài đặt.';
  if (status === 429) return 'Gửi quá nhanh hoặc hết hạn mức/tiền trong tài khoản. Đợi một chút hoặc kiểm tra tài khoản.';
  if (status >= 500) return 'Máy chủ AI đang bận. Thử lại sau ít phút.';
  return `Lỗi AI (${status})${detail ? ': ' + detail : ''}`;
}

async function fail(res) {
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.error?.message || j?.message || '';
  } catch {
    // không có nội dung lỗi
  }
  throw new ProviderError(statusMessage(res.status, detail));
}

// Đọc luồng Server-Sent Events, gọi onData với mỗi dòng "data:" đã parse JSON.
async function readSSE(res, onData) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        onData(JSON.parse(data));
      } catch {
        // bỏ qua dòng hỏng
      }
    }
  }
}

function baseUrlFor(provider, settings) {
  if (provider === 'custom') return (settings.customBaseUrl || '').trim().replace(/\/+$/, '');
  return PROVIDERS[provider].baseUrl;
}

function wrapNetwork(err) {
  if (err instanceof ProviderError || err?.name === 'AbortError') throw err;
  throw new ProviderError('Không kết nối được tới máy chủ AI. Kiểm tra mạng (hoặc dịch vụ này không cho gọi từ trình duyệt).');
}

// OpenAI, OpenRouter và các dịch vụ tương thích OpenAI.
export async function openaiCompatChat({ provider, settings, key, model, system, messages, onText, signal }) {
  const base = baseUrlFor(provider, settings);
  if (!base) throw new ProviderError('Chưa nhập địa chỉ API (Base URL) cho nhà cung cấp tuỳ chỉnh.');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'Tieng Anh cho QA';
  }
  let res;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({ model, stream: true, messages: [{ role: 'system', content: system }, ...messages] }),
    });
  } catch (err) {
    wrapNetwork(err);
  }
  if (!res.ok) await fail(res);
  let text = '';
  await readSSE(res, (j) => {
    if (j.error) throw new ProviderError('Lỗi AI: ' + (j.error.message || 'không rõ'));
    const delta = j.choices?.[0]?.delta?.content;
    if (delta) {
      text += delta;
      onText?.(text);
    }
  });
  return text;
}

export async function geminiChat({ settings, key, model, system, messages, onText, signal }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      }),
    });
  } catch (err) {
    wrapNetwork(err);
  }
  if (!res.ok) await fail(res);
  let text = '';
  await readSSE(res, (j) => {
    const parts = j.candidates?.[0]?.content?.parts || [];
    const delta = parts.map((p) => p.text || '').join('');
    if (delta) {
      text += delta;
      onText?.(text);
    }
    if (j.promptFeedback?.blockReason) throw new ProviderError('AI từ chối trả lời yêu cầu này. Hãy thử diễn đạt khác.');
  });
  return text;
}

// Lấy danh sách model từ nhà cung cấp (không gồm Anthropic — xử lý bằng SDK trong ai.js).
export async function listRemoteModels(provider, settings, key) {
  let res;
  try {
    if (provider === 'gemini') {
      res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    } else {
      const base = baseUrlFor(provider, settings);
      if (!base) throw new ProviderError('Chưa nhập Base URL.');
      res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
    }
  } catch (err) {
    wrapNetwork(err);
  }
  if (!res.ok) await fail(res);
  const j = await res.json();
  if (provider === 'gemini') {
    return (j.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName || '' }));
  }
  let ids = (j.data || []).map((m) => ({ id: m.id, label: m.name || '' }));
  if (provider === 'openai') ids = ids.filter((m) => /^(gpt|o\d|chatgpt)/.test(m.id) && !/(audio|realtime|tts|transcribe|image|search|embedding)/.test(m.id));
  return ids.sort((a, b) => a.id.localeCompare(b.id));
}
