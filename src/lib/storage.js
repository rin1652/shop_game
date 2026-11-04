// Lưu tiến độ trong localStorage của trình duyệt (chỉ trên thiết bị này).
const KEY = 'tagt:v1';

const DEFAULT_STATE = {
  version: 1,
  settings: {
    provider: 'anthropic',
    keys: {}, // API key theo từng nhà cung cấp
    models: {}, // model đã chọn theo từng nhà cung cấp
    customBaseUrl: '',
    mentorVoice: '',
    myVoice: '',
    rate: 0.95,
    autoSpeak: true,
  },
  cards: {},
  days: {},
  lessonDone: {},
  chat: { scenario: 'requirement', messages: [] },
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    const settings = { ...structuredClone(DEFAULT_STATE.settings), ...(parsed.settings || {}) };
    // Chuyển từ bản cũ (chỉ có 1 key Claude) sang dạng nhiều nhà cung cấp.
    if (settings.apiKey) {
      settings.keys = { ...settings.keys, anthropic: settings.keys?.anthropic || settings.apiKey };
      if (settings.model) settings.models = { ...settings.models, anthropic: settings.models?.anthropic || settings.model };
    }
    delete settings.apiKey;
    delete settings.model;
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      settings,
      chat: { ...DEFAULT_STATE.chat, ...(parsed.chat || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Bộ nhớ bị chặn (chế độ ẩn danh…) — app vẫn chạy, chỉ không lưu.
  }
}

export const getState = () => state;

export function replaceState(next) {
  state = {
    ...structuredClone(DEFAULT_STATE),
    ...next,
    settings: { ...DEFAULT_STATE.settings, ...(next.settings || {}) },
  };
  save();
}

export function resetState() {
  const keepSettings = state.settings;
  state = structuredClone(DEFAULT_STATE);
  state.settings = keepSettings;
  save();
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + n));
}

export function getDay(key = todayKey()) {
  if (!state.days[key]) state.days[key] = { steps: {}, seconds: 0, reflect: '', lessonId: null };
  return state.days[key];
}

export function streak() {
  const active = (k) => {
    const d = state.days[k];
    return d && (Object.values(d.steps || {}).some(Boolean) || d.seconds >= 300);
  };
  let k = todayKey();
  if (!active(k)) k = addDays(k, -1);
  let n = 0;
  while (active(k)) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}
