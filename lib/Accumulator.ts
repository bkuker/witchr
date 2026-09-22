import { fail, checkInt } from "./types";

export type SignDigit = "0" | "9";

const ACCUMULATOR_LENGTH = 16; // 1 sign digit + 15 decimal digits (I.1, "15 digits")
const ACCUMULATOR_PATTERN = /^[09]\d{15}$/;

export class Accumulator {
  // --- Accumulator (I.4, addresses 08/09): sign + 15 digits, fixed width. ---
  private _accumulator = "0" + "0".repeat(ACCUMULATOR_LENGTH - 1);

  /** Raw 16-character accumulator: sign digit followed by 15 decimal digits. */
  get accumulator(): string {
    return this._accumulator;
  }

  set accumulator(value: string) {
    if (!ACCUMULATOR_PATTERN.test(value)) {
      fail(
        `accumulator must be a ${ACCUMULATOR_LENGTH}-character string, sign digit ('0'/'9') followed by ${
          ACCUMULATOR_LENGTH - 1
        } decimal digits, got ${JSON.stringify(value)}`,
      );
    }
    this._accumulator = value;
  }

  /** Convenience: set from a sign and the 15 magnitude digits separately. */
  setAccumulatorValue(sign: SignDigit, digits: string): void {
    this.accumulator = sign + digits;
  }

  get accumulatorSign(): SignDigit {
    return this._accumulator[0] as SignDigit;
  }

  /** All 15 digits after the sign (i.e. address 09 minus its sign). */
  get accumulatorDigits(): string {
    return this._accumulator.slice(1);
  }

  /** Last 7 digits, with the accumulator's sign prepended (address 08; I.4). */
  get accumulatorLow7(): string {
    return this._accumulator[0] + this._accumulator.slice(-7);
  }
}
