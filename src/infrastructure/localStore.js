// Kho dữ liệu: lưu toàn bộ trạng thái học trong localStorage của trình duyệt (chỉ trên thiết bị này).
const KEY = 'tagt:v1';

export const DEFAULT_STATE = {
  version: 1,
  route: null, // null = lộ trình mặc định
  settings: {
    provider: 'anthropic',
    keys: {}, // API key theo từng nhà cung cấp
    models: {}, // model đã chọn theo từng nhà cung cấp
    modelLists: {},
    customBaseUrl: '',
    mentorVoice: '',
    myVoice: '',
    rate: 0.95,
    autoSpeak: true,
    textSize: 'm',
  },
  cards: {},
  days: {},
  lessonDone: {},
  lessonSteps: {},
  aiCache: {},
  chat: { scenario: 'selfheal', lessonId: null, messages: [] },
};

const fresh = () => structuredClone(DEFAULT_STATE);

// Gộp dữ liệu đã lưu với giá trị mặc định và chuyển dữ liệu từ các bản cũ.
export function normalize(saved = {}) {
  const settings = { ...fresh().settings, ...(saved.settings || {}) };
  if (settings.apiKey) {
    settings.keys = { ...settings.keys, anthropic: settings.keys?.anthropic || settings.apiKey };
    if (settings.model) settings.models = { ...settings.models, anthropic: settings.models?.anthropic || settings.model };
  }
  delete settings.apiKey;
  delete settings.model;
  return { ...fresh(), ...saved, settings, chat: { ...fresh().chat, ...(saved.chat || {}) } };
}

export function createLocalStore(storage = globalThis.localStorage) {
  let state;
  try {
    const raw = storage?.getItem(KEY);
    state = raw ? normalize(JSON.parse(raw)) : fresh();
  } catch {
    state = fresh();
  }
  const save = () => {
    try {
      storage?.setItem(KEY, JSON.stringify(state));
    } catch {
      // Bộ nhớ bị chặn (chế độ ẩn danh…): app vẫn chạy, chỉ không lưu.
    }
  };
  return {
    state: () => state,
    save,
    replace(next) {
      state = normalize(next);
      save();
    },
    reset() {
      const settings = state.settings;
      state = fresh();
      state.settings = settings;
      save();
    },
  };
}
