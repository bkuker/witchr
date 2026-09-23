import { Accumulator } from "./Accumulator";
import { Console } from "./Console";
import { Printer } from "./Printer";
import { Stores } from "./Stores";
import { TapeSet } from "./TapeSet";
import { Timer } from "./Timer";
import { fail, checkInt, type Address, type Layout, toAddress } from "./types";
import { Word, DWord, multiply, divide } from "./word";

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
  tapes: TapeSet = new TapeSet();
  readonly accumulator: Accumulator = new Accumulator();
  readonly timer: Timer = new Timer();
  readonly stores: Stores = new Stores();
  readonly console: Console = new Console();
  readonly printer1: Printer = new Printer();

  currentOrder: Word; // --- Current order (the block most recently fetched into control). ---
  orderSource: Address; // --- Order source: which reader or store is supplying orders (I.9). ---
  signTest: boolean = false; // --- Sign test flag (I.8): null until the first 011/012 order runs. ---

  shift: Shift = Shift.B; // --- Shift (I.12): pending, consumed by the next 1/3/7 order. ---
  layout: Layout = 1; // --- Print/punch layout (I.11): must be set before any output. ---

  private _delayedAlarmLives = 3; /** Delayed-alarm restarts remaining before it escalates to Normal Alarm. */
  private static readonly MAX_DELAYED_ALARM_LIVES = 3;

  status: RunStatus = RunStatus.RUNNING; // --- Run status. ---

  // --- Finish / Signal / Alarm lamps (I.13, II.1). ---
  finish = false;
  signal = false;
  alarm = false;
  alarmMode: AlarmMode = AlarmMode.NORMAL; // --- Alarm-key mode and the delayed-alarm restart count (II.2(d)). ---

  step(): void {
    if (this.status != RunStatus.RUNNING) return;

    const o = this.currentOrderString;

    if (o.startsWith("0")) {
      //Control
      if (o == "00000") {
        //NOOP
      } else if (o == "00100") {
        //FINISH
        this.finish = true;
        this.restoreDelayedAlarmLives();
        if (!this.console.passFinish) {
          this.status = RunStatus.STOPPED;
        }
      } else if (o == "00200") {
        this.signal = true;
        if (!this.console.passSignal) {
          this.status = RunStatus.STOPPED;
        }
      } else if (o.startsWith("01")) {
        //SIGN TEST TODO
        const addr = toAddress(o.slice(-2));
        const val = this.read(addr);
        if (o.startsWith("011")) {
          this.signTest = !val.isNegative;
        } else if (o.startsWith("012")) {
          this.signTest = val.isNegative;
        } else {
          //TODO ERROR
        }
      } else if (o.startsWith("02")) {
        //TRANSFER CONTROL
        const addr = toAddress(o.slice(-2));
        if (o.startsWith("021")) {
          this.orderSource = addr;
        } else if (o.startsWith("022")) {
          if (this.signTest) this.orderSource = addr;
        } else {
          //TODO ERROR
        }
      } else if (o.startsWith("03") || (o.startsWith("05") && this.signTest)) {
        //SEARCH BLOCK TODO
        const reader = toAddress(o.slice(-2));
        const block = Number.parseInt(o.charAt(2));
        this.tapes.tapes[reader - 1].search(block);
      } else if (o.startsWith("07")) {
        //SET LAYOUT
        this.layout = Number.parseInt(o.charAt(2)) as Layout;
      } else if (o.startsWith("08")) {
        //SET SHIFT
      }
    } else {
      //Arithmetic
      const order = Number.parseInt(o.charAt(0));
      const ss = toAddress(o.substring(1, 3));
      const rr = toAddress(o.substring(3, 5));
      switch (order) {
        case 1:
        case 2:
          this.add(rr, this.read(ss));
          if (order == 2) this.clear(ss);
          break;
        case 3:
        case 4:
          this.add(rr, this.read(ss).negate());
          if (order == 4) this.clear(ss);
          break;
        case 5:
          //TODO Check Overflow
          let mr = multiply(this.accumulator.value, this.read(ss), this.read(rr));
          this.accumulator.value = mr.accumulator;
          this.stores.write(rr, mr.multiplier);
          break;
        case 6:
          let dr = divide(this.accumulator.value, this.read(ss));
          this.accumulator.value = dr.remainder;
          this.stores.write(rr, dr.quotient);
        //TODO check overflow
      }
    }

    this.currentOrder = this.read(this.orderSource);

    if (this.orderSource >= 10) {
      this.orderSource++;
    }
  }

  clear(address: Address) {
    switch (address) {
      case 0:
      case 1:
      case 2: //Perferator 1
      case 3: //Printer 2
      case 4: //Perferator 2
      case 5: //spare
      case 6: //spare
      case 7: //spare
      case 8:
      //TODO
      case 9:
        this.accumulator.clear();
        break;
      default:
        this.stores.clear(address);
        break;
    }
  }

  //TODO Make it ADD and do a clear function
  add(address: Address, value: Word) {
    switch (address) {
      case 0:
        break; //Drain
      case 1:
        this.printer1.print(value, this.layout);
        break;
      case 2: //Perferator 1
      case 3: //Printer 2
      case 4: //Perferator 2
      case 5: //spare
      case 6: //spare
      case 7: //spare
        break;
      case 8:
      //TODO
      case 9:
        this.accumulator.add(value);
        break;
      default:
        let ar = this.stores.read(address).add(value);
        this.stores.write(address, ar.result);
        break;
    }
  }

  read(address: Address): Word {
    if (address == 0) {
      return Word.zero();
    } else if (address >= 1 && address <= 4) {
      const tape = this.tapes.tapes[this.orderSource - 1];
      tape.advance();
      let s = tape.current() ?? "0";
      if (/^\[\d\]$/.test(s)) tape.advance();
      return Word.fromString(tape.current() ?? "0");
    } else if (address < 8) {
      throw "Read from spare tape";
    } else if (address == 8) {
      return this.accumulator.value.low;
    } else if (address == 9) {
      return this.accumulator.value.high;
    } else {
      return this.stores.read(address);
    }
  }

  /** Read the pending shift and reset it to B, as happens after it is used. */
  consumeShift(): Shift {
    const shift = this.shift;
    this.shift = Shift.B;
    return shift;
  }

  get currentOrderString(): string {
    return this.currentOrder.magnitudeDigits.slice(0, 5).join("");
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
    this.currentOrder = Word.fromParts("0", "03101000");
    this.orderSource = 1;
  }
}
