import { QA_VOCAB, INDIAN_ENGLISH, ACCENT_TIPS } from '../data/glossary.js';
import { addCard, hasCard } from '../lib/srs.js';
import { esc, speakBtn, toast } from '../lib/ui.js';

const TABS = [
  { id: 'qa', label: 'Từ vựng QA' },
  { id: 'indian', label: 'Tiếng Anh kiểu Ấn' },
  { id: 'accent', label: 'Mẹo nghe giọng Ấn' },
];

export function renderGlossary(el, tab = 'qa') {
  const list = tab === 'indian' ? INDIAN_ENGLISH : QA_VOCAB;
  const prefix = tab === 'indian' ? 'i' : 'v';
  el.innerHTML = `
    <h1>Từ điển</h1>
    <nav class="tabs">${TABS.map((t) => `<a href="#/glossary/${t.id}" class="${t.id === tab ? 'active' : ''}">${t.label}</a>`).join('')}</nav>
    ${
      tab === 'accent'
        ? `<div class="list">${ACCENT_TIPS.map((t) => `<div class="card"><b>${esc(t.t)}</b><p class="muted">${esc(t.d)}</p></div>`).join('')}</div>`
        : `<input class="search" id="q" type="search" placeholder="Tìm từ…" autocomplete="off">
           <div class="row"><button class="btn ghost small" id="addAll">+ Thêm tất cả vào flashcard</button></div>
           <div class="list" id="items">
             ${list
               .map(
                 (v, i) => `
               <div class="card term" data-text="${esc((v.en + ' ' + v.vi).toLowerCase())}">
                 <div class="head"><b>${esc(v.en)}</b>
                   <span class="ctrl">${speakBtn(tab === 'indian' ? v.ex : v.en, tab === 'indian' ? 'mentor' : 'me')}
                   <button class="btn-icon add" data-id="${prefix}:${i}" ${hasCard(`${prefix}:${i}`) ? 'disabled' : ''} title="Thêm vào flashcard">${hasCard(`${prefix}:${i}`) ? '✓' : '+'}</button></span>
                 </div>
                 <div>${esc(v.vi)}</div>
                 <div class="example">“${esc(v.ex)}”</div>
               </div>`,
               )
               .join('')}
           </div>`
    }
  `;
  if (tab === 'accent') return;
  el.querySelector('#q').oninput = (e) => {
    const q = e.target.value.trim().toLowerCase();
    el.querySelectorAll('.term').forEach((n) => (n.hidden = q && !n.dataset.text.includes(q)));
  };
  el.querySelectorAll('.add').forEach((b) => {
    b.onclick = () => {
      if (addCard(b.dataset.id)) {
        b.textContent = '✓';
        b.disabled = true;
        toast('Đã thêm vào flashcard.');
      }
    };
  });
  el.querySelector('#addAll').onclick = () => {
    let n = 0;
    list.forEach((_, i) => addCard(`${prefix}:${i}`) && n++);
    toast(n ? `Đã thêm ${n} thẻ.` : 'Tất cả đã có trong flashcard.');
    renderGlossary(el, tab);
  };
}
