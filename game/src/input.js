// SOLARA BAY — input.js: keyboard + mouse state, one place, no DOM writes.
export const keys = {};
let mouseDown = false;
let mouseX = 0, mouseY = 0;

export function initInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('mousedown', (e) => { mouseDown = true; mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; });
}

export function pressed(code) { return !!keys[code]; }
export function consume(code) { if (keys[code]) { keys[code] = false; return true; } return false; }
export function isMouseDown() { return mouseDown; }
export function mousePos() { return { x: mouseX, y: mouseY }; }

// Edge-triggered key helper: call once per frame with a state bag.
export function edgePressed(bag, code) {
  const now = !!keys[code];
  const was = !!bag[code];
  bag[code] = now;
  return now && !was;
}
