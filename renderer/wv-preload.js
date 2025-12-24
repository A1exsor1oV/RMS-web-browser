// Этот скрипт исполняется ВНУТРИ <webview> и имеет доступ только к ipcRenderer.
const { ipcRenderer } = require('electron');

// проверяем, редактируемый ли элемент
const editable = el => ['INPUT', 'TEXTAREA'].includes(el.tagName);

// любые способы получения / потери фокуса
let suppressHide = false;

window.addEventListener('focusin',  e => {
  if (editable(e.target)) {
    suppressHide = false; // сбрасываем только на focusin
    ipcRenderer.sendToHost('vk-show');
  }
});
window.addEventListener('focusout', e => {
  // Не отправлять vk-hide, если фокус всё ещё на input/textarea
  setTimeout(() => {
    if (editable(document.activeElement)) return;
    if (editable(e.target)) ipcRenderer.sendToHost('vk-hide');
  }, 0);
});

// тапы по полю (если страница сама не вызывает focus)
window.addEventListener('pointerdown', e => editable(e.target) && ipcRenderer.sendToHost('vk-show'));


let selStart = 0, selEnd = 0, lastEl = null;
let queue = '';                 // буфер символов
let timer = null;

document.addEventListener('selectionchange', () => {
  const el = document.activeElement;
  if (editable(el)) {
    selStart = el.selectionStart;
    selEnd   = el.selectionEnd;
    lastEl   = el;
  }
});

ipcRenderer.on('vk-type', (_e, ch) => {
  queue += ch;
  clearTimeout(timer);
  timer = setTimeout(flush, 15);        // 1 flush / 15 мс
});

function flush () {
  const el = editable(document.activeElement) ? document.activeElement : lastEl;
  if (!editable(el) || !queue) { queue=''; return; }

  let v = el.value, start = selStart, end = selEnd;

  for (const ch of queue) {
    if (ch === '\b') {                          // backspace
      if (start === end && start) { v = v.slice(0, --start) + v.slice(end); }
      else                          { v = v.slice(0, start) + v.slice(end); }
    } else if (ch === '\n') {                   // enter
      if (el.tagName === 'TEXTAREA') { v = v.slice(0, start) + '\n' + v.slice(end); ++start; }
      else                             el.form?.requestSubmit?.();
    } else {                                   // обычный символ
      v = v.slice(0, start) + ch + v.slice(end); ++start;
    }
    end = start;
  }

  queue = '';
  el.value = v;
  el.focus({ preventScroll:true });
  el.setSelectionRange(start, start);
  selStart = selEnd = start;
  el.dispatchEvent(new Event('input', { bubbles:true }));
}
