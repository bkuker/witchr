import { fail, checkInt, type Address, type Layout } from "./types";

export type SignDigit = "0" | "9";

export enum Shift {
  A = 1,
  B = 2,
  C = 3,
  D = 4,
  E = 5,
  F = 6,
  G = 7,
  H = 8,
  J = 9,
}

export enum AlarmMode {
  NONE,
  NORMAL,
  DELAYED,
}

export enum RunStatus {
  RUNNING,
  STOPPED,
}

const ORDER_PATTERN = /^\d{5}$/;

export class Witch {
  currentOrder: number; // --- Current order (the block most recently fetched into control). ---
  orderSource: Address; // --- Order source: which reader or store is supplying orders (I.9). ---
  signTest: boolean | null = null; // --- Sign test flag (I.8): null until the first 011/012 order runs. ---

  shift: Shift = Shift.B; // --- Shift (I.12): pending, consumed by the next 1/3/7 order. ---
  layout: Layout | undefined; // --- Print/punch layout (I.11): must be set before any output. ---

  private _delayedAlarmLives = 3; /** Delayed-alarm restarts remaining before it escalates to Normal Alarm. */
  private static readonly MAX_DELAYED_ALARM_LIVES = 3;

  status: RunStatus = RunStatus.STOPPED; // --- Run status. ---

  // --- Finish / Signal / Alarm lamps (I.13, II.1). ---
  finish = false;
  signal = false;
  alarm = false;
  alarmMode: AlarmMode = AlarmMode.NORMAL; // --- Alarm-key mode and the delayed-alarm restart count (II.2(d)). ---

  /** Read the pending shift and reset it to B, as happens after it is used. */
  consumeShift(): Shift {
    const shift = this.shift;
    this.shift = Shift.B;
    return shift;
  }

  get delayedAlarmLives(): number {
    return this._delayedAlarmLives;
  }

  set delayedAlarmLives(value: number) {
    checkInt(value, 0, Witch.MAX_DELAYED_ALARM_LIVES, "delayedAlarmLives");
    this._delayedAlarmLives = value;
  }

  /**
   * Consume one delayed-alarm restart. Escalates to Normal Alarm once none
   * remain, per "after three such attempts the normal alarm is given" (II.2(d)).
   */
  useDelayedAlarmLife(): void {
    if (this._delayedAlarmLives === 0) {
      fail("useDelayedAlarmLife called with no lives remaining");
    }
    this._delayedAlarmLives -= 1;
    if (this._delayedAlarmLives === 0) {
      this.alarmMode = AlarmMode.NORMAL;
    }
  }

  /** "Whenever a finish signal is passed ... the full three lives are restored" (II.2(d)). */
  restoreDelayedAlarmLives(): void {
    this._delayedAlarmLives = Witch.MAX_DELAYED_ALARM_LIVES;
  }

  constructor() {
    // Power-on / restart hardwires these two orders (I.3): search reader 01
    // for block 1, then transfer control to reader 01. Everything else
    // (accumulator, stores) is "unwanted (but probably not random)" on real
    // hardware (III.14); this model starts it at a deterministic zero instead.
    this.currentOrder = 3101;
    this.orderSource = 1;
  }
}
