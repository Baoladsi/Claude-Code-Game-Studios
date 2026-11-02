/**
 * Keyboard + mouse input with edge detection ("pressed this step").
 * Bindings come from data/config.js so they can be remapped.
 */
export class Input {
  /**
   * @param {Record<string, string[]>} bindings action -> list of KeyboardEvent.code / 'Mouse0' / 'Mouse2'
   * @param {EventTarget} target where to listen (window)
   * @param {HTMLCanvasElement} canvas used to map mouse coords
   */
  constructor(bindings, target, canvas) {
    this.bindings = bindings;
    this.down = new Set();
    this.pressedCodes = new Set();
    this.mouse = { x: 0, y: 0, active: false };
    this.canvas = canvas;
    if (!target) return;
    target.addEventListener('keydown', (e) => {
      if (this.isBound(e.code)) e.preventDefault();
      if (!e.repeat) this.pressedCodes.add(e.code);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left;
        this.mouse.y = e.clientY - r.top;
        this.mouse.active = true;
      });
      canvas.addEventListener('mouseleave', () => (this.mouse.active = false));
      canvas.addEventListener('mousedown', (e) => {
        const code = `Mouse${e.button}`;
        this.pressedCodes.add(code);
        this.down.add(code);
      });
      canvas.addEventListener('mouseup', (e) => this.down.delete(`Mouse${e.button}`));
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  isBound(code) {
    return Object.values(this.bindings).some((codes) => codes.includes(code));
  }

  /** Is the action currently held? */
  held(action) {
    return (this.bindings[action] || []).some((c) => this.down.has(c));
  }

  /** Was the action pressed since the last `endStep()`? */
  pressed(action) {
    return (this.bindings[action] || []).some((c) => this.pressedCodes.has(c));
  }

  /** Movement vector from the move bindings (not normalised). */
  moveVector() {
    return {
      x: (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0),
      y: (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0),
    };
  }

  /** Synthetic press, used by automated smoke tests. */
  tap(code) {
    this.pressedCodes.add(code);
  }

  /** Clear edge-triggered presses; call once after each simulation step. */
  endStep() {
    this.pressedCodes.clear();
  }
}
