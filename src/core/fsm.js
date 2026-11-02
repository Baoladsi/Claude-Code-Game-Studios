/**
 * Generic finite state machine used by enemies and the Unique Boss.
 *
 * A state is `{ enter?(owner, data, prev), update?(owner, dt, timeInState), exit?(owner, next) }`.
 * `update` may return the name of the next state to transition to.
 */
export class StateMachine {
  /**
   * @param {object} owner entity passed to every state hook
   * @param {Record<string, object>} states state table
   * @param {string} [initial] state to enter immediately
   */
  constructor(owner, states, initial) {
    this.owner = owner;
    this.states = states;
    this.current = null;
    this.time = 0;
    if (initial) this.change(initial);
  }

  /** Transition to `name`, running exit/enter hooks. */
  change(name, data) {
    const next = this.states[name];
    if (!next) throw new Error(`Unknown state: ${name}`);
    const prev = this.current;
    if (prev && this.states[prev].exit) this.states[prev].exit(this.owner, name);
    this.current = name;
    this.time = 0;
    if (next.enter) next.enter(this.owner, data, prev);
  }

  /** Advance the current state by `dt` seconds. */
  update(dt) {
    this.time += dt;
    const state = this.states[this.current];
    if (state.update) {
      const next = state.update(this.owner, dt, this.time);
      if (next && next !== this.current) this.change(next);
    }
  }

  /** True when the current state is `name`. */
  is(name) {
    return this.current === name;
  }
}
