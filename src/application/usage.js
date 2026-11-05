// Use case: thống kê dùng AI trong ngày và bộ nhớ đệm kết quả AI.
import { state, persist } from './ports.js';
import { getDay } from './progress.js';
import { estimateTokens } from '../domain/aiPolicy.js';

const CACHE_MAX = 300;

function usage() {
  const day = getDay();
  day.ai ||= { calls: 0, inTok: 0, outTok: 0, avoided: 0, cached: 0 };
  return day.ai;
}

export function recordCall(input, output) {
  const u = usage();
  u.calls += 1;
  u.inTok += estimateTokens(input);
  u.outTok += estimateTokens(output);
  persist();
}

export function recordAvoided(kind = 'avoided') {
  usage()[kind === 'cached' ? 'cached' : 'avoided'] += 1;
  persist();
}

export const todayUsage = () => ({ ...usage() });

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + str.length;
}

export function cacheGet(key) {
  return state().aiCache?.[hash(key)]?.v ?? null;
}

export function cacheSet(key, value) {
  const s = state();
  s.aiCache ||= {};
  s.aiCache[hash(key)] = { v: value, t: Date.now() };
  const keys = Object.keys(s.aiCache);
  if (keys.length > CACHE_MAX) {
    keys
      .sort((a, b) => s.aiCache[a].t - s.aiCache[b].t)
      .slice(0, keys.length - CACHE_MAX)
      .forEach((k) => delete s.aiCache[k]);
  }
  persist();
}
