/* =====================  DOM-узлы  ===================== */
const webview   = document.getElementById('webview');
// ── сигналы из wv-preload.js ────────────────────────────
webview.addEventListener('ipc-message', ev => {
  if (ev.channel === 'vk-show') {
    vkLastInput = null;   // курсор внутри webview, а не в основной странице
    showVK();
  }
  if (ev.channel === 'vk-hide') hideVK();
});

const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('overlay');
const edge      = document.getElementById('edge');
const listBox   = document.getElementById('linkList');

const btnRefresh = document.getElementById('btnRefresh');
const btnAdd     = document.getElementById('btnAdd');
const btnManage  = document.getElementById('btnManage');

const dlgPass   = document.getElementById('dlgPass');
const passInput = document.getElementById('passInput');

const dlgAdd    = document.getElementById('dlgAdd');
const addTitle  = document.getElementById('addTitle');
const addURL    = document.getElementById('addURL');

const dlgEdit   = document.getElementById('dlgEdit');
const editTitle = document.getElementById('editTitle');
const editURL   = document.getElementById('editURL');

const dlgManage  = document.getElementById('dlgManage');
const manageList = document.getElementById('manageList');

const vk = document.getElementById('vk');      // контейнер клавиатуры

/* =====================  состояние  ==================== */
let links        = [];
let swipeStartX  = null;
let dragFrom     = null;
let vkKeyboard   = null;
let vkCurrentLang = 'en';
let vkShift       = false;
let vkLastInput   = null;          // ★ запоминаем последний input

const vkLayouts = {
  en: [
    '1 2 3 4 5 6 7 8 9 0 @ . ,',
    'q w e r t y u i o p',
    'a s d f g h j k l',
    '{shift} z x c v b n m - / : {bksp}',
    '{lang} {space} {enter}'
  ],
  enShift: [
    '1 2 3 4 5 6 7 8 9 0 @ . ,',
    'Q W E R T Y U I O P',
    'A S D F G H J K L',
    '{shift} Z X C V B N M - / : {bksp}',
    '{lang} {space} {enter}'
  ],
  ru: [
    '1 2 3 4 5 6 7 8 9 0 @ . ,',
    'й ц у к е н г ш щ з х ъ',
    'ф ы в а п р о л д ж э',
    '{shift} я ч с м и т ь б ю - / : {bksp}',
    '{lang} {space} {enter}'
  ],
  ruShift: [
    '1 2 3 4 5 6 7 8 9 0 @ . ,',
    'Й Ц У К Е Н Г Ш Щ З Х Ъ',
    'Ф Ы В А П Р О Л Д Ж Э',
    '{shift} Я Ч С М И Т Ь Б Ю - / : {bksp}',
    '{lang} {space} {enter}'
  ]
};

function getCurrentLayout() {
  if (vkCurrentLang === 'en') return vkShift ? vkLayouts.enShift : vkLayouts.en;
  if (vkCurrentLang === 'ru') return vkShift ? vkLayouts.ruShift : vkLayouts.ru;
}

function getCurrentDisplay() {      // ★ кнопка «enter», не «return»
  return {
    '{bksp}': '⌫',
    '{enter}': 'enter',
    '{space}': 'space',
    '{shift}': '⇧',
    '{lang}': vkCurrentLang === 'en' ? 'Рус' : 'Eng'
  };
}

function updateVK() {
  if (!vkKeyboard) return;
  // Оптимизация: обновляем только если реально изменилась раскладка или язык
  const currentLayout = getCurrentLayout();
  const currentDisplay = getCurrentDisplay();
  if (
    vkKeyboard.options?.layout?.default?.join('') === currentLayout.join('') &&
    JSON.stringify(vkKeyboard.options?.display) === JSON.stringify(currentDisplay)
  ) return;
  vkKeyboard.setOptions({
    layout: { default: currentLayout },
    display: currentDisplay
  });
}

function renderVK() {
  const Keyboard = window.SimpleKeyboard?.default || window.SimpleKeyboard;
  vkKeyboard ??= new Keyboard(vk, {
    layout : { default: getCurrentLayout() },
    display: getCurrentDisplay(),
    onKeyPress: vkOnKeyPress,
    theme  : 'hg-theme-default vk-theme-mobile',
    useButtonTag: true
  });
  // Добавляем кнопку сворачивания, если её нет
  if (!vk.querySelector('.vk-hide-btn')) {
    const btn = document.createElement('button');
    btn.className = 'vk-hide-btn';
    btn.textContent = '⮟';
    btn.title = 'Свернуть клавиатуру';
    btn.onclick = e => { e.stopPropagation(); hideVK(); };
    vk.appendChild(btn);
  }
  updateVK();                               // при повторном вызове всего лишь
}                                           // обновляем опции


function showVK() {
  if (vk.classList.contains('hidden')) {
    document.body.appendChild(vk);
    vk.classList.remove('hidden');
    document.body.classList.add('vk-open');
  }
  if (!vkKeyboard) renderVK();
  else updateVK();
}
function hideVK() { 
  vk.classList.add('hidden');
  document.body.classList.add('vk-open'); 
}

// Hide VK when clicking outside input or VK
window.addEventListener('pointerdown', e => {
  const isInput = e.target.tagName === 'INPUT';
  const isVK = e.target.closest('#vk');
  const isDialog = e.target.closest('dialog[open]');
  // Если клик вне input, вне клавиатуры и вне открытого диалога — закрыть всё
  if (!isInput && !isVK && !isDialog) {
    hideVK();
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
  }
});

// ★ показываем клаву и запоминаем поле, чтобы потом восстанавливать фокус
window.addEventListener('focusin', e => {
  if (e.target.tagName === 'INPUT') {
    vkLastInput = e.target;
    showVK();
  }
});

function vkOnKeyPress(key) {
  if (key === '{lang}') {
    const prevLang = vkCurrentLang;
    vkCurrentLang = vkCurrentLang === 'en' ? 'ru' : 'en';
    vkShift = false;
    if (prevLang !== vkCurrentLang) updateVK();
    if (vkLastInput && document.activeElement !== vkLastInput) vkLastInput.focus();
    return;
  }
  if (key === '{shift}') {
    const prevShift = vkShift;
    vkShift = !vkShift;
    if (prevShift !== vkShift) updateVK();
    if (vkLastInput && document.activeElement !== vkLastInput) vkLastInput.focus();
    return;
  }
  if (key === '{enter}') {
    // Для textarea вставляем перевод строки, для input сабмитим форму
    if (!vkLastInput) {
      webview.send('vk-type', '\n');
      webview.focus();
    } else if (vkLastInput.tagName === 'TEXTAREA') {
      vkLastInput.value += '\n';
      vkLastInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (vkLastInput.form) {
      vkLastInput.form.requestSubmit?.();
    }
    vkLastInput?.focus();
    return;
  }
  typeToInput(key);
  if (vkLastInput && document.activeElement !== vkLastInput) vkLastInput.focus();
}

function typeToInput(key) {
  // Если фокус внутри webview, отправляем команду в webview
  if (!vkLastInput) {
    let text = '';
    if (key === '{bksp}' || key === 'backspace') text = '\b';
    else if (key === '{enter}') text = '\n';
    else if (key === '{space}') text = ' ';
    else if (!key.startsWith('{')) text = key;
    if (text) {
      webview.send('vk-type', text);
      // Явно возвращаем фокус в поле (если возможно)
      webview.focus();
    }
    return;
  }
  // Обычное поведение для input на основной странице
  const el = vkLastInput;
  if (!el || el.tagName !== 'INPUT') return;
  if (key === '{bksp}' || key === 'backspace') el.value = el.value.slice(0, -1);
  else if (key === '{enter}') return; // submit handled in vkOnKeyPress
  else if (key === '{space}') el.value += ' ';
  else if (!key.startsWith('{')) el.value += key;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ====================================================== */
/*                Б О К О В О Е  М Е Н Ю                  */
/* ====================================================== */

function cap (el) {
  el.addEventListener('pointerdown', e => {
    swipeStartX = e.clientX;
    if (el === edge) el.setPointerCapture(e.pointerId);
  });
  ['pointerup','pointercancel'].forEach(ev =>
    el.addEventListener(ev, e => {
      swipeStartX = null;
      if (el === edge) el.releasePointerCapture(e.pointerId);
    }));
}
cap(edge); cap(sidebar);

edge.addEventListener('pointermove',   e => {
  if (swipeStartX !== null && e.clientX - swipeStartX > 40) toggleMenu(true);
});
sidebar.addEventListener('pointermove', e => {
  if (swipeStartX !== null && e.clientX - swipeStartX < -40) toggleMenu(false);
});
overlay.onclick = () => toggleMenu(false);

function toggleMenu (open) {
  sidebar.classList.toggle('open', open);
  overlay.classList.toggle('hidden', !open);
  webview.style.pointerEvents = open ? 'none' : 'auto';
  edge.style.display          = open ? 'none' : 'block';
}

/* ====================================================== */
/*          З А Г Р У З К А   С С Ы Л О К                 */
/* ====================================================== */

(async () => {
  links = (await window.api.getConfig()).links;
  renderList();
  if (links[0]) webview.src = links[0].url;
})();

function renderList () {
  listBox.innerHTML = '';
  links.forEach(l => {
    const b = document.createElement('button');
    b.innerHTML = `<span class="icon">🔗</span><span>${l.title}</span>`;
    b.onclick   = () => { webview.src = l.url; toggleMenu(false); };
    listBox.appendChild(b);
  });
}

/* ====================================================== */
/*                     Ф У Т Е Р                          */
/* ====================================================== */

btnRefresh.onclick = () => webview.reload();
btnAdd    .onclick = () => passwordGate(showAddDialog);
btnManage .onclick = () => passwordGate(showManageDialog);

/* ====================================================== */
/*                    Д И А Л О Г И                       */
/* ====================================================== */

async function passwordGate (onOk) {
  while (true) {
    passInput.value = '';
    showVK();
    overlay.classList.remove('hidden'); // Show overlay manually
    document.body.appendChild(vk);      // <-- гарантируем порядок
    dlgPass.show(); // Use non-modal dialog
    passInput.focus();
    const res = await new Promise(r => dlgPass.onclose = () => r(dlgPass.returnValue));
    hideVK();
    overlay.classList.add('hidden'); // Hide overlay
    if (res === 'cancel') return;
    if (await window.api.checkPass(passInput.value.trim())) { onOk(); return; }
  }
}

async function showAddDialog () {
  addTitle.value = ''; addURL.value = 'http://';
  showVK();
  overlay.classList.remove('hidden');
  document.body.appendChild(vk);      // <-- гарантируем порядок
  dlgAdd.show(); // Use non-modal dialog
  const ok = await new Promise(r => {
    addTitle.focus();
    dlgAdd.onclose = () => r(dlgAdd.returnValue === 'ok');
  });
  hideVK();
  overlay.classList.add('hidden');
  if (!ok) return;
  const t = addTitle.value.trim(), u = addURL.value.trim();
  if (!t || !u) { alert('Заполните оба поля'); return; }
  links.push({ title: t, url: u });
  await window.api.saveLinks(links);
  renderList();
}

async function showEditDialog(idx) {
  const link = links[idx];
  if (dlgManage.open) dlgManage.close();
  
  editTitle.value = link.title;
  editURL.value   = link.url;

  showVK();
  overlay.classList.remove('hidden');
  dlgEdit.show();

  const ok = await new Promise(r => {
    editTitle.focus();
    dlgEdit.onclose = () => r(dlgEdit.returnValue === 'ok');
  });

  hideVK();
  overlay.classList.add('hidden');
  if (!ok) return;

  const t = editTitle.value.trim(), u = editURL.value.trim();
  if (!t || !u) { alert('Заполните оба поля'); return; }

  links[idx] = { title: t, url: u };
  await window.api.saveLinks(links);
  renderList(); renderManage();
}

function showManageDialog () {
  renderManage();
  showVK();
  overlay.classList.remove('hidden');
  document.body.appendChild(vk);      // <-- гарантируем порядок
  dlgManage.show(); // Use non-modal dialog
  dlgManage.onclose = () => {
    hideVK();
    overlay.classList.add('hidden');
  };
}

function renderManage () {
  manageList.innerHTML = '';
  links.forEach((l, i) => {
    const li = document.createElement('li');
    li.className = 'row'; li.draggable = true; li.dataset.idx = i;
    li.innerHTML =
      `<span class="move">☰</span><span class="txt">${l.title}</span>` +
      `<div class="btns">
         <button type="button" class="edit">✏</button>
         <button type="button" class="del">🗑</button>
       </div>`;

    li.addEventListener('dragstart', () => dragFrom = +li.dataset.idx);
    li.addEventListener('dragover',  e => e.preventDefault());
    li.addEventListener('drop', async () => {
      const to = +li.dataset.idx;
      if (to === dragFrom) return;
      links.splice(to, 0, ...links.splice(dragFrom, 1));
      await window.api.saveLinks(links);
      renderList(); renderManage();
    });

    li.querySelector('.edit').onclick = () => showEditDialog(i);

    li.querySelector('.del').onclick = async () => {
      links.splice(i, 1);
      await window.api.saveLinks(links);
      renderList(); renderManage();
    };

    manageList.appendChild(li);
  });
}

// Гарантируем, что клики по клавиатуре не закроют её
vk.addEventListener('pointerdown', e => e.stopPropagation());

/* Esc → закрыть меню */
window.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });
