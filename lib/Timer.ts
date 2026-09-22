import { fail, checkInt, type Address } from "./types";

export class Timer {
  // --- Inactivity guard timer (I.10, II.2(d)): ~30s search/idle alarm window. ---
  private _lastActivityAt = 0; // ms epoch; caller supplies the clock

  get lastActivityAt(): number {
    return this._lastActivityAt;
  }

  set lastActivityAt(value: number) {
    if (!Number.isFinite(value) || value < 0) {
      fail(`lastActivityAt must be a non-negative finite number of ms, got ${value}`);
    }
    this._lastActivityAt = value;
  }

  /** Record activity now (or at `now`), resetting the inactivity guard. */
  touch(now: number = Date.now()): void {
    this.lastActivityAt = now;
  }
}
