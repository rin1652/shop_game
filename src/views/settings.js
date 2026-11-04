import { getState, save, replaceState, resetState } from '../lib/storage.js';
import { MODELS } from '../lib/ai.js';
import { loadVoices, englishVoices, speak, hasIndianVoice } from '../lib/speech.js';
import { esc, toast } from '../lib/ui.js';

export async function renderSettings(el) {
  const s = getState().settings;
  await loadVoices();
  const voices = englishVoices();
  const opts = (sel) =>
    `<option value="">Tự động</option>` +
    voices.map((v) => `<option value="${esc(v.name)}" ${v.name === sel ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');

  el.innerHTML = `
    <h1>Cài đặt</h1>

    <section class="card">
      <h3>AI Mentor (không bắt buộc)</h3>
      <p class="muted small">Dán Claude API key (bắt đầu bằng <code>sk-ant-</code>, tạo ở console.anthropic.com). Key chỉ lưu trong trình duyệt trên thiết bị này, không gửi đi đâu ngoài máy chủ Anthropic. Đừng dùng app này trên máy dùng chung.</p>
      <label class="field">API key <input id="apiKey" type="password" autocomplete="off" value="${esc(s.apiKey)}" placeholder="sk-ant-..."></label>
      <label class="field">Model <select id="model">${MODELS.map((m) => `<option value="${m.id}" ${m.id === s.model ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></label>
    </section>

    <section class="card">
      <h3>Giọng đọc</h3>
      ${
        hasIndianVoice()
          ? '<p class="muted small">✓ Máy có giọng tiếng Anh Ấn Độ (en-IN).</p>'
          : `<p class="muted small">Chưa thấy giọng tiếng Anh Ấn Độ (en-IN). Cách thêm:<br>
             • Android: Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói → Công cụ của Google → cài “English (India)”.<br>
             • iPhone: Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → English → chọn giọng India.<br>
             • Máy tính: Chrome trên Windows/Mac thường có sẵn “Google English (India)” hoặc “Microsoft Heera/Ravi”.</p>`
      }
      <label class="field">Giọng mentor <select id="mentorVoice">${opts(s.mentorVoice)}</select></label>
      <label class="field">Giọng của bạn (câu mẫu) <select id="myVoice">${opts(s.myVoice)}</select></label>
      <label class="field">Tốc độ đọc: <b id="rateVal">${s.rate}</b> <input id="rate" type="range" min="0.6" max="1.3" step="0.05" value="${s.rate}"></label>
      <div class="row">
        <button class="btn ghost small" id="testMentor">Thử giọng mentor</button>
        <button class="btn ghost small" id="testMe">Thử giọng câu mẫu</button>
      </div>
    </section>

    <section class="card">
      <h3>Sao lưu tiến độ</h3>
      <p class="muted small">Tiến độ chỉ lưu trên trình duyệt này. Xuất file để sao lưu hoặc chuyển sang thiết bị khác (file không chứa API key).</p>
      <div class="row">
        <button class="btn ghost small" id="export">Xuất file</button>
        <label class="btn ghost small">Nhập file<input id="import" type="file" accept="application/json" hidden></label>
        <button class="btn ghost small danger" id="reset">Xoá tiến độ</button>
      </div>
    </section>
  `;

  const bind = (id, key, map = (v) => v) => {
    el.querySelector('#' + id).onchange = (e) => {
      s[key] = map(e.target.value);
      save();
      toast('Đã lưu.');
    };
  };
  bind('apiKey', 'apiKey', (v) => v.trim());
  bind('model', 'model');
  bind('mentorVoice', 'mentorVoice');
  bind('myVoice', 'myVoice');
  el.querySelector('#rate').oninput = (e) => {
    s.rate = Number(e.target.value);
    el.querySelector('#rateVal').textContent = s.rate;
    save();
  };
  el.querySelector('#testMentor').onclick = () => speak('Hi Phuc, kindly do the needful and revert by EOD, okay?', { kind: 'mentor' });
  el.querySelector('#testMe').onclick = () => speak('Sorry, could you say that again a little more slowly?', { kind: 'me' });

  el.querySelector('#export').onclick = () => {
    const data = structuredClone(getState());
    data.settings = { ...data.settings, apiKey: '' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tieng-anh-giao-tiep-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  el.querySelector('#import').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.cards) throw new Error();
      data.settings = { ...data.settings, apiKey: s.apiKey };
      replaceState(data);
      toast('Đã nhập tiến độ.');
      location.hash = '#/today';
    } catch {
      toast('File không hợp lệ.');
    }
  };
  el.querySelector('#reset').onclick = () => {
    if (confirm('Xoá toàn bộ tiến độ học (giữ lại cài đặt)?')) {
      resetState();
      toast('Đã xoá tiến độ.');
      location.hash = '#/today';
    }
  };
}
