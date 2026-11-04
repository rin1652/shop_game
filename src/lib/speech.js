// Đọc (Text-to-Speech) và nghe giọng nói (Speech Recognition) bằng Web Speech API có sẵn trong trình duyệt.
import { getState } from './storage.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voicesCache = [];

export function loadVoices() {
  return new Promise((resolve) => {
    if (!synth) return resolve([]);
    const done = () => {
      voicesCache = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
      resolve(voicesCache);
    };
    if (synth.getVoices().length) return done();
    synth.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

export const englishVoices = () => voicesCache;

function pickVoice(kind) {
  const s = getState().settings;
  const wanted = kind === 'mentor' ? s.mentorVoice : s.myVoice;
  const byName = voicesCache.find((v) => v.name === wanted);
  if (byName) return byName;
  const lang = (v) => v.lang.toLowerCase().replace('_', '-');
  if (kind === 'mentor') {
    return voicesCache.find((v) => lang(v) === 'en-in') || voicesCache.find((v) => lang(v) === 'en-gb') || voicesCache[0];
  }
  return voicesCache.find((v) => lang(v) === 'en-us') || voicesCache[0];
}

export const hasIndianVoice = () => voicesCache.some((v) => v.lang.toLowerCase().replace('_', '-') === 'en-in');

export function stopSpeaking() {
  synth?.cancel();
}

export function speak(text, { kind = 'me', slow = false } = {}) {
  return new Promise((resolve) => {
    if (!synth || !text) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(kind);
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else {
      u.lang = kind === 'mentor' ? 'en-IN' : 'en-US';
    }
    const base = Number(getState().settings.rate) || 1;
    u.rate = slow ? Math.max(0.5, base * 0.7) : base;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const canListen = Boolean(Recognition);

let active = null;

// Nghe một câu. onInterim nhận chữ tạm thời. Trả về câu cuối cùng.
export function listen({ onInterim } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error('Trình duyệt này không hỗ trợ nhận giọng nói. Hãy dùng Chrome (Android/máy tính) hoặc Safari (iPhone).'));
    stopSpeaking();
    if (active) active.abort();
    const r = new Recognition();
    active = r;
    r.lang = 'en-US';
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.continuous = false;
    let finalText = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      onInterim?.((finalText + ' ' + interim).trim());
    };
    r.onerror = (e) => {
      active = null;
      if (e.error === 'no-speech') resolve('');
      else if (e.error === 'not-allowed') reject(new Error('Chưa cho phép dùng micro. Hãy bật quyền micro cho trang này.'));
      else if (e.error === 'aborted') resolve(finalText.trim());
      else reject(new Error('Lỗi nhận giọng nói: ' + e.error));
    };
    r.onend = () => {
      active = null;
      resolve(finalText.trim());
    };
    r.start();
  });
}

export function stopListening() {
  active?.stop();
}

// So sánh câu nói với câu mẫu theo từ (LCS). Trả về % và danh sách từ của câu mẫu có/không khớp.
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

export function scoreSpeech(target, said) {
  const a = norm(target);
  const b = norm(said);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      matched[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const hits = matched.filter(Boolean).length;
  const extra = Math.max(0, b.length - hits);
  const score = a.length ? Math.round((hits / (a.length + extra * 0.5)) * 100) : 0;
  return { score: Math.min(100, score), words: a.map((w, k) => ({ w, ok: matched[k] })) };
}
