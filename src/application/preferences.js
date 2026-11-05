// Use case: cài đặt (nhà cung cấp AI, key, model, giọng đọc, cỡ chữ) và sao lưu/khôi phục tiến độ.
import { state, persist, store } from './ports.js';

export const settings = () => state().settings;

export function updateSettings(patch) {
  Object.assign(state().settings, patch);
  persist();
}

export function setProviderKey(provider, key) {
  const s = state().settings;
  s.keys = { ...s.keys, [provider]: key.trim() };
  persist();
}

export function setProviderModel(provider, model) {
  const s = state().settings;
  s.models = { ...s.models, [provider]: model.trim() };
  persist();
}

// File sao lưu không bao giờ chứa API key.
export function exportProgress() {
  const data = structuredClone(state());
  data.settings = { ...data.settings, keys: {} };
  return data;
}

export function importProgress(data) {
  if (!data || typeof data !== 'object' || !data.cards || !data.days) throw new Error('File không hợp lệ.');
  const keys = state().settings.keys;
  store().replace({ ...data, settings: { ...data.settings, keys, apiKey: undefined } });
}

export const resetProgress = () => store().reset();
