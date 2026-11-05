// Adapter giọng nói: đọc (Text-to-Speech) và nghe (Speech Recognition) bằng Web Speech API của trình duyệt.
// Không đọc trạng thái app trực tiếp: lựa chọn giọng/tốc độ được truyền vào qua setVoicePreferences.

let prefs = () => ({ mentorVoice: '', myVoice: '', rate: 1 });
export const setVoicePreferences = (fn) => (prefs = fn);

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voicesCache = [];

let voicesLoaded = null;

// Tải danh sách giọng một lần; các lần sau trả về ngay (không bắt trang phải chờ).
export function loadVoices() {
  if (voicesLoaded) return voicesLoaded;
  voicesLoaded = new Promise((resolve) => {
    if (!synth) return resolve([]);
    const done = () => {
      voicesCache = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
      resolve(voicesCache);
    };
    if (synth.getVoices().length) return done();
    synth.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
  return voicesLoaded;
}

export const englishVoices = () => voicesCache;

function pickVoice(kind) {
  const s = prefs();
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
    const base = Number(prefs().rate) || 1;
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
