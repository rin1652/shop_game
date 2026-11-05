// Cổng (ports) mà tầng application cần. Bản cài đặt thật được gắn vào ở src/ui/main.js (composition root);
// test gắn bản giả. Nhờ vậy use case không phụ thuộc trình duyệt, localStorage hay nhà cung cấp AI cụ thể.
//   store: { state(), save(), replace(next), reset() }
//   clock: { today(): 'YYYY-MM-DD' }
//   ai:    { providers, chat(config, request), listModels(config) }

let ports = null;

export function setPorts(p) {
  ports = p;
}

function need() {
  if (!ports) throw new Error('Chưa gắn ports: gọi setPorts() trước khi dùng use case.');
  return ports;
}

export const store = () => need().store;
export const state = () => need().store.state();
export const persist = () => need().store.save();
export const today = () => need().clock.today();
export const ai = () => need().ai;
