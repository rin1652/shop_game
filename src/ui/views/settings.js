import { settings, updateSettings, setProviderKey, setProviderModel, exportProgress, importProgress, resetProgress } from '../../application/preferences.js';
import { testConnection, loadModelList, aiConfig } from '../../application/coach.js';
import { todayUsage } from '../../application/usage.js';
import { ai } from '../../application/ports.js';
import { loadVoices, englishVoices, speak, hasIndianVoice } from '../../infrastructure/speech.js';
import { esc, toast, page } from '../components.js';

const SIZES = [
  { id: 's', label: 'Nhỏ' },
  { id: 'm', label: 'Vừa' },
  { id: 'l', label: 'Lớn' },
  { id: 'xl', label: 'Rất lớn' },
];

export async function renderSettings(el) {
  await loadVoices();
  const s = settings();
  const voices = englishVoices();
  const opts = (sel) =>
    `<option value="">Tự động</option>` + voices.map((v) => `<option value="${esc(v.name)}" ${v.name === sel ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  const u = todayUsage();

  el.innerHTML = `
    ${page({ title: 'Cài đặt', back: { href: '#/today', label: 'Hôm nay' } })}

    <div class="section-header">AI Mentor · không bắt buộc</div>
    <div class="group" id="aiSection"></div>
    <p class="section-footer">Key chỉ lưu trong trình duyệt trên thiết bị này và chỉ được gửi tới nhà cung cấp bạn chọn. Đừng dùng app này trên máy dùng chung.</p>

    <div class="section-header">AI hôm nay</div>
    <div class="group">
      <div class="usage">
        <div><b>${u.calls}</b><span class="footnote">lần gọi AI</span></div>
        <div><b>~${(u.inTok + u.outTok).toLocaleString('vi-VN')}</b><span class="footnote">token (ước tính)</span></div>
        <div><b>${u.avoided}</b><span class="footnote">lần tự xử lý, không cần AI</span></div>
        <div><b>${u.cached}</b><span class="footnote">lần dùng lại kết quả cũ</span></div>
      </div>
    </div>
    <details class="section-footer"><summary>Khi nào app gọi AI?</summary>
      <ul>
        <li>Luôn ưu tiên hiệu quả học: không giới hạn số lần, không tự đổi sang model rẻ hơn.</li>
        <li><b>Không gọi AI</b> khi máy tự làm được ngang hoặc tốt hơn: chấm phát âm và nghe chép, flashcard, đọc giọng mentor, câu trả lời giống câu mẫu ≥ 80%.</li>
        <li><b>Không gọi AI</b> khi AI không giúp được gì: câu trống, quá ngắn, gửi trùng, bài viết đã được sửa trước đó.</li>
        <li><b>Gọi AI</b> khi chỉ AI làm được: hội thoại tự do, chấm câu trả lời khác câu mẫu, sửa bài viết mới.</li>
      </ul>
    </details>

    <div class="section-header">Hiển thị</div>
    <div class="group">
      <div class="row"><span class="body"><span class="title">Cỡ chữ</span>
        <nav class="segmented" style="margin:8px 0 0">${SIZES.map((z) => `<a href="#" data-size="${z.id}" class="${(s.textSize || 'm') === z.id ? 'active' : ''}">${z.label}</a>`).join('')}</nav></span></div>
    </div>

    <div class="section-header">Giọng đọc</div>
    <div class="group">
      <label class="row"><span class="body"><span class="title">Giọng mentor</span></span><select id="mentorVoice">${opts(s.mentorVoice)}</select></label>
      <label class="row"><span class="body"><span class="title">Giọng câu mẫu</span></span><select id="myVoice">${opts(s.myVoice)}</select></label>
      <div class="row"><span class="body"><span class="title">Tốc độ đọc · <b id="rateVal">${s.rate}</b></span>
        <input id="rate" type="range" min="0.6" max="1.3" step="0.05" value="${s.rate}" aria-label="Tốc độ đọc"></span></div>
      <button class="row" id="testMentor"><span class="body"><span class="title" style="color:var(--tint)">Thử giọng mentor</span></span></button>
      <button class="row" id="testMe"><span class="body"><span class="title" style="color:var(--tint)">Thử giọng câu mẫu</span></span></button>
    </div>
    <p class="section-footer">${
      hasIndianVoice()
        ? '✓ Máy có giọng tiếng Anh Ấn Độ (en-IN).'
        : `Chưa thấy giọng tiếng Anh Ấn Độ (en-IN). Android: Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói → Công cụ của Google → cài “English (India)”. iPhone: Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → English → chọn giọng India. Máy tính: Chrome thường có sẵn “Google English (India)”.`
    }</p>

    <div class="section-header">Sao lưu tiến độ</div>
    <div class="group">
      <button class="row" id="export"><span class="body"><span class="title" style="color:var(--tint)">Xuất file sao lưu</span></span></button>
      <label class="row" style="cursor:pointer"><span class="body"><span class="title" style="color:var(--tint)">Nhập file sao lưu</span></span><input id="import" type="file" accept="application/json" hidden></label>
      <button class="row" id="reset"><span class="body"><span class="title" style="color:var(--red)">Xoá tiến độ</span></span></button>
    </div>
    <p class="section-footer">Tiến độ chỉ lưu trên trình duyệt này. File sao lưu không chứa API key.</p>
  `;

  renderAISection(el.querySelector('#aiSection'));

  el.querySelectorAll('[data-size]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      updateSettings({ textSize: a.dataset.size });
      document.documentElement.dataset.size = a.dataset.size;
      el.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('active', x === a));
    }),
  );
  el.querySelector('#mentorVoice').onchange = (e) => updateSettings({ mentorVoice: e.target.value });
  el.querySelector('#myVoice').onchange = (e) => updateSettings({ myVoice: e.target.value });
  el.querySelector('#rate').oninput = (e) => {
    updateSettings({ rate: Number(e.target.value) });
    el.querySelector('#rateVal').textContent = e.target.value;
  };
  el.querySelector('#testMentor').onclick = () => speak('Hi Phuc, kindly check the healing report and revert by EOD, okay?', { kind: 'mentor' });
  el.querySelector('#testMe').onclick = () => speak('Sorry, could you say that again a little more slowly?', { kind: 'me' });

  el.querySelector('#export').onclick = () => {
    const blob = new Blob([JSON.stringify(exportProgress(), null, 2)], { type: 'application/json' });
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
      importProgress(JSON.parse(await file.text()));
      toast('Đã nhập tiến độ.');
      location.hash = '#/today';
    } catch {
      toast('File không hợp lệ.');
    }
  };
  el.querySelector('#reset').onclick = () => {
    if (confirm('Xoá toàn bộ tiến độ học? Cài đặt và API key vẫn được giữ.')) {
      resetProgress();
      toast('Đã xoá tiến độ.');
      location.hash = '#/today';
    }
  };
}

function renderAISection(box) {
  const s = settings();
  const providers = ai().providers;
  const id = providers[s.provider] ? s.provider : 'anthropic';
  const p = providers[id];
  const current = s.models?.[id] || p.defaultModel || '';
  const options = [...p.suggestions];
  (s.modelLists?.[id] || []).forEach((m) => options.some((o) => o.id === m.id) || options.push(m));
  if (current && !options.some((o) => o.id === current)) options.unshift({ id: current, label: '' });

  box.innerHTML = `
    <label class="row"><span class="body"><span class="title">Nhà cung cấp</span></span>
      <select id="provider">${Object.entries(providers).map(([k, v]) => `<option value="${k}" ${k === id ? 'selected' : ''}>${esc(v.label)}${s.keys?.[k] ? ' ✓' : ''}</option>`).join('')}</select></label>
    ${id === 'custom' ? `<label class="row"><span class="body"><span class="title">Base URL</span></span><input id="baseUrl" type="text" autocomplete="off" autocapitalize="off" value="${esc(s.customBaseUrl || '')}" placeholder="https://api.example.com/v1"></label>` : ''}
    <label class="row"><span class="body"><span class="title">API key</span></span>
      <input id="key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(s.keys?.[id] || '')}" placeholder="${esc(p.keyHint.split(' · ')[0])}"></label>
    <label class="row"><span class="body"><span class="title">Model</span></span>
      <select id="modelSel">${options.length ? '' : '<option value="">Tải danh sách…</option>'}${options
        .map((m) => `<option value="${esc(m.id)}" ${m.id === current ? 'selected' : ''}>${esc(m.label || m.id)}</option>`)
        .join('')}</select></label>
    <label class="row"><span class="body"><span class="title">Tên model khác</span></span>
      <input id="modelText" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(current)}" placeholder="gõ tên model"></label>
    <button class="row" id="loadModels"><span class="body"><span class="title" style="color:var(--tint)">Tải danh sách model</span></span></button>
    <button class="row" id="testAI"><span class="body"><span class="title" style="color:var(--tint)">Kiểm tra kết nối</span><span class="sub" id="aiStatus"></span></span></button>
    <div class="row"><span class="body"><span class="sub">${esc(p.keyHint)}${p.keyUrl ? ` · <a href="${p.keyUrl}" target="_blank" rel="noopener">Lấy key</a>` : ''}${id === 'gemini' ? ' · Gemini có gói dùng miễn phí.' : ''}<br>
      Đang dùng: <b>${esc(aiConfig().label)}</b>${aiConfig().model ? ` · <code>${esc(aiConfig().model)}</code>` : ' · <span class="err">chưa chọn model</span>'}</span></span></div>
  `;
  const status = () => box.querySelector('#aiStatus');
  const keyInput = box.querySelector('#key');
  box.querySelector('#provider').onchange = (e) => {
    updateSettings({ provider: e.target.value });
    renderAISection(box);
  };
  box.querySelector('#baseUrl')?.addEventListener('change', (e) => {
    updateSettings({ customBaseUrl: e.target.value.trim() });
    toast('Đã lưu Base URL.');
  });
  keyInput.onchange = () => {
    setProviderKey(id, keyInput.value);
    toast('Đã lưu key.');
    renderAISection(box);
  };
  box.querySelector('#modelSel').onchange = (e) => {
    if (!e.target.value) return;
    setProviderModel(id, e.target.value);
    toast('Đã chọn model.');
    renderAISection(box);
  };
  box.querySelector('#modelText').onchange = (e) => {
    setProviderModel(id, e.target.value);
    toast('Đã lưu model.');
    renderAISection(box);
  };
  box.querySelector('#loadModels').onclick = async (e) => {
    setProviderKey(id, keyInput.value);
    e.currentTarget.disabled = true;
    status().textContent = 'Đang tải danh sách model…';
    try {
      const list = await loadModelList(id);
      renderAISection(box);
      status().innerHTML = `<span class="ok-text">✓ Tải được ${list.length} model. Chọn một model ở trên.</span>`;
    } catch (err) {
      status().innerHTML = `<span class="err">${esc(err.message)}</span>`;
      box.querySelector('#loadModels').disabled = false;
    }
  };
  box.querySelector('#testAI').onclick = async (e) => {
    setProviderKey(id, keyInput.value);
    const btn = e.currentTarget;
    btn.disabled = true;
    status().textContent = 'Đang kiểm tra…';
    try {
      const reply = await testConnection();
      status().innerHTML = `<span class="ok-text">✓ Kết nối được! AI trả lời: “${esc(reply.trim().slice(0, 60))}”</span>`;
    } catch (err) {
      status().innerHTML = `<span class="err">${esc(err.message)}</span>`;
    } finally {
      btn.disabled = false;
    }
  };
}
