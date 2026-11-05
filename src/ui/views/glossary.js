import { addCard, hasCard, addGlossaryCards } from '../../application/review.js';
import { GLOSSARY_LISTS } from '../../domain/curriculum.js';
import { ACCENT_TIPS } from '../../data/glossary.js';
import { esc, toast, speakBtns, page, segmented } from '../components.js';

const TABS = [
  { id: 'ai', label: 'AI testing' },
  { id: 'qa', label: 'QA' },
  { id: 'indian', label: 'Kiểu Ấn' },
  { id: 'accent', label: 'Mẹo nghe' },
];

export function renderGlossary(el, tab = 'ai') {
  if (!TABS.some((t) => t.id === tab)) tab = 'ai';
  const head = `${page({ title: 'Từ điển' })}${segmented(TABS.map((t) => ({ ...t, href: `#/glossary/${t.id}` })), tab)}`;
  if (tab === 'accent') {
    el.innerHTML = `${head}<div class="group">${ACCENT_TIPS.map((t) => `<div class="row"><span class="body"><span class="title">${esc(t.t)}</span><span class="sub">${esc(t.d)}</span></span></div>`).join('')}</div>`;
    return;
  }
  const { prefix, list } = GLOSSARY_LISTS[tab];
  const mentor = tab === 'indian';
  el.innerHTML = `${head}
    <input class="search" id="q" type="search" placeholder="Tìm từ…" autocomplete="off" aria-label="Tìm từ">
    <div class="ctrl" style="margin:0 0 12px"><button class="btn small" id="addAll">+ Thêm cả ${list.length} từ vào flashcard</button></div>
    <div class="group" id="items">
      ${list
        .map((v, i) => {
          const id = `${prefix}:${i}`;
          const added = hasCard(id);
          return `<div class="row term-row term" data-text="${esc((v.en + ' ' + v.vi).toLowerCase())}">
            <div class="term-head"><b>${esc(v.en)}</b>
              <button class="add" data-id="${id}" ${added ? 'disabled' : ''} aria-label="Thêm vào flashcard">${added ? '✓' : '+'}</button></div>
            <div class="vi">${esc(v.vi)}</div>
            <div class="example">“${esc(v.ex)}”</div>
            <div class="ctrl">${speakBtns(mentor ? v.ex : v.en, mentor ? 'mentor' : 'me')}</div>
          </div>`;
        })
        .join('')}
    </div>`;
  el.querySelector('#q').oninput = (e) => {
    const q = e.target.value.trim().toLowerCase();
    el.querySelectorAll('.term').forEach((n) => (n.hidden = Boolean(q) && !n.dataset.text.includes(q)));
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
    const n = addGlossaryCards(tab);
    toast(n ? `Đã thêm ${n} thẻ.` : 'Tất cả đã có trong flashcard.');
    renderGlossary(el, tab);
  };
}
