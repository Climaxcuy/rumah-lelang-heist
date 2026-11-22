// Input keyboard + mouse. WASD/panah bergerak, Shift lari (berisik), E ambil
// loot, Q lempar koin pengalih, Space/Enter konfirmasi, M bisu, R mulai ulang.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DISTRACT = 4;
export const ACTION_INTERACT = 8;
export const ACTION_MUTE = 16;
export const ACTION_RESTART = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseDown = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    }
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyQ') actions |= ACTION_DISTRACT;
    if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseDown() {
    mouseDown = true;
    actions |= ACTION_CONFIRM;
  }
  function onMouseUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // Vektor gerak ternormalisasi dari tombol yang sedang ditekan.
    direction() {
      let x = 0;
      let z = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      const len = Math.hypot(x, z);
      if (len > 0) {
        x /= len;
        z /= len;
      }
      return { x, z, run: keys.has('ShiftLeft') || keys.has('ShiftRight') || mouseDown };
    },
    isDown(code) {
      return keys.has(code);
    },
  };
}
