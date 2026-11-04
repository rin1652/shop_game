import { getState, save, replaceState, resetState } from '../lib/storage.js';
import { PROVIDERS, chat, listModels } from '../lib/ai.js';
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

    <section class="card" id="aiSection"></section>

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
  renderAISection(el.querySelector('#aiSection'));
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
    data.settings = { ...data.settings, keys: {} }; // không xuất API key
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
      data.settings = { ...data.settings, keys: s.keys, apiKey: undefined };
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

function renderAISection(box) {
  const s = getState().settings;
  s.keys ||= {};
  s.models ||= {};
  s.modelLists ||= {};
  const id = PROVIDERS[s.provider] ? s.provider : 'anthropic';
  const p = PROVIDERS[id];
  const current = s.models[id] || p.defaultModel || '';
  const loaded = s.modelLists[id] || [];
  const options = [...p.suggestions];
  loaded.forEach((m) => options.some((o) => o.id === m.id) || options.push(m));
  if (current && !options.some((o) => o.id === current)) options.unshift({ id: current, label: '' });
  const withKey = Object.keys(PROVIDERS).filter((k) => s.keys[k]);

  box.innerHTML = `
    <h3>AI Mentor (không bắt buộc)</h3>
    <p class="muted small">Chọn nhà cung cấp AI bạn có key. Mỗi nhà cung cấp lưu key và model riêng; đổi qua lại không mất. Key chỉ lưu trong trình duyệt trên thiết bị này và chỉ được gửi tới máy chủ của nhà cung cấp đó. Đừng dùng app này trên máy dùng chung.</p>
    <label class="field">Nhà cung cấp
      <select id="provider">${Object.entries(PROVIDERS)
        .map(([k, v]) => `<option value="${k}" ${k === id ? 'selected' : ''}>${esc(v.label)}${s.keys[k] ? ' ✓' : ''}</option>`)
        .join('')}</select>
    </label>
    ${
      id === 'custom'
        ? `<label class="field">Base URL (địa chỉ API, kết thúc trước /chat/completions)
            <input id="baseUrl" type="text" autocomplete="off" autocapitalize="off" value="${esc(s.customBaseUrl || '')}" placeholder="https://api.example.com/v1"></label>`
        : ''
    }
    <label class="field">API key
      <span class="key-row">
        <input id="key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(s.keys[id] || '')}" placeholder="${esc(p.keyHint)}">
        <button class="btn ghost small" id="toggleKey" type="button">Hiện</button>
      </span>
    </label>
    <p class="muted small">${esc(p.keyHint)}${p.keyUrl ? ` · <a href="${p.keyUrl}" target="_blank" rel="noopener">Lấy key</a>` : ''}${
      id === 'gemini' ? ' · Gemini có gói dùng miễn phí.' : ''
    }</p>
    <label class="field">Model
      <select id="modelSel">
        ${options.length ? '' : '<option value="">— Bấm “Tải danh sách model” —</option>'}
        ${options.map((m) => `<option value="${esc(m.id)}" ${m.id === current ? 'selected' : ''}>${esc(m.label ? `${m.label} · ${m.id}` : m.id)}</option>`).join('')}
      </select>
    </label>
    <label class="field">hoặc nhập tên model
      <input id="modelText" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(current)}" placeholder="vd: tên model chính xác của nhà cung cấp"></label>
    <div class="row">
      <button class="btn ghost small" id="loadModels" type="button">Tải danh sách model</button>
      <button class="btn small" id="testAI" type="button">Kiểm tra kết nối</button>
    </div>
    <div id="aiStatus" class="small"></div>
    <p class="muted small">Đang dùng: <b>${esc(p.label)}</b>${current ? ` · <code>${esc(current)}</code>` : ' · <span class="err">chưa chọn model</span>'}${
      withKey.length ? ` · Đã có key: ${withKey.map((k) => esc(PROVIDERS[k].label)).join(', ')}` : ''
    }</p>
  `;

  const status = box.querySelector('#aiStatus');
  const setModel = (m) => {
    s.models[id] = m.trim();
    save();
  };
  box.querySelector('#provider').onchange = (e) => {
    s.provider = e.target.value;
    save();
    renderAISection(box);
  };
  box.querySelector('#baseUrl')?.addEventListener('change', (e) => {
    s.customBaseUrl = e.target.value.trim();
    save();
    toast('Đã lưu Base URL.');
  });
  const keyInput = box.querySelector('#key');
  keyInput.onchange = () => {
    s.keys[id] = keyInput.value.trim();
    save();
    toast('Đã lưu key.');
    renderAISection(box);
  };
  box.querySelector('#toggleKey').onclick = (e) => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    e.target.textContent = keyInput.type === 'password' ? 'Hiện' : 'Ẩn';
  };
  box.querySelector('#modelSel').onchange = (e) => {
    if (!e.target.value) return;
    setModel(e.target.value);
    box.querySelector('#modelText').value = e.target.value;
    toast('Đã chọn model.');
    renderAISection(box);
  };
  box.querySelector('#modelText').onchange = (e) => {
    setModel(e.target.value);
    toast('Đã lưu model.');
    renderAISection(box);
  };
  box.querySelector('#loadModels').onclick = async (e) => {
    s.keys[id] = keyInput.value.trim();
    save();
    e.target.disabled = true;
    box.querySelector('#aiStatus').textContent = 'Đang tải danh sách model…';
    try {
      const list = await listModels(id);
      s.modelLists[id] = list;
      if (!s.models[id] && list.length) s.models[id] = list[0].id;
      save();
      renderAISection(box);
      box.querySelector('#aiStatus').innerHTML = `<span class="ok-text">✓ Tải được ${list.length} model. Chọn một model ở trên.</span>`;
    } catch (err) {
      box.querySelector('#aiStatus').innerHTML = `<span class="err">${esc(err.message)}</span>`;
      e.target.disabled = false;
    }
  };
  box.querySelector('#testAI').onclick = async (e) => {
    s.keys[id] = keyInput.value.trim();
    save();
    e.target.disabled = true;
    status.textContent = 'Đang kiểm tra…';
    try {
      const reply = await chat({
        system: 'You are a connection test. Reply with exactly one word: OK',
        messages: [{ role: 'user', content: 'Say OK' }],
      });
      status.innerHTML = `<span class="ok-text">✓ Kết nối được! AI trả lời: “${esc(reply.trim().slice(0, 60))}”</span>`;
    } catch (err) {
      status.innerHTML = `<span class="err">${esc(err.message)}</span>`;
    } finally {
      e.target.disabled = false;
    }
  };
}
