/**
 * Minimal synchronous event bus. Simulation emits; HUD, audio, feed and
 * renderer listen. Keeps gameplay code free of presentation imports.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.handlers = new Map();
  }

  /** Subscribe to `name`. Returns an unsubscribe function. */
  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(fn);
    return () => this.handlers.get(name).delete(fn);
  }

  /** Emit `name` with an optional payload to every subscriber. */
  emit(name, payload = {}) {
    const set = this.handlers.get(name);
    if (set) for (const fn of set) fn(payload);
    const any = this.handlers.get('*');
    if (any) for (const fn of any) fn({ name, ...payload });
  }
}
