/**
 * Word / DWord — the machine's two fixed-point decimal value types.
 *
 * A Word is a general store's contents: sign digit + 8 magnitude digits
 * (I.1, I.4). A DWord is the accumulator: sign digit + 15 magnitude digits
 * (I.1, I.4's "09" row). Both are immutable — every operation returns a new
 * value rather than mutating in place. The mutable Store/Accumulator classes
 * that hold one of these are a separate, later piece.
 *
 * Negative numbers use 9's-complement digits (each digit d -> 9-d, sign
 * digit included) with an end-around carry for addition/subtraction — see
 * `ripple` below for the derivation. Section references are to the manual
 * (Wolv-Manual.pdf), "Notes on Programming and Operating", 2nd edition.
 *
 * Scope, per your request: Word, DWord, add, negate, multiply, divide.
 * Not included yet, deliberately: the address-08/09 accessors (splitting a
 * DWord into its "last 7 digits" view). I started to bolt that on as a
 * Word-shaped `lowWord()` and stopped — those 7 digits plus a sign are only
 * 8 characters, one short of a Word's 9, and the manual's own "x 10^8"
 * rescaling note for printing it (I.4) suggests it isn't meant to be read
 * as an ordinary Word at all. Rather than invent a padding convention I'm
 * not sure about, I'm leaving it for a follow-up once we've looked at it
 * properly.
 */

/** A digit position's value, 0-9. */
export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** A sign digit: '0' is +, '9' is - (I.2). */
export type SignDigit = "0" | "9";

/** Result of an operation that can overflow the machine's numeric range. */
export interface ArithResult<T> {
  readonly result: T;
  /** True if the true result falls outside 10 > N > -10 (I.2) and is unusable. */
  readonly overflow: boolean;
}

function fail(message: string): never {
  throw new RangeError(message);
}

/**
 * Ripple-add two equal-length digit arrays (sign digit included as an
 * ordinary position), carrying right-to-left, with the 9's-complement
 * end-around carry: a carry out of the sign position wraps around and is
 * added back in at the rightmost digit (this is *how* 9's-complement
 * subtraction works, not a special case of it — see the file-level comment).
 *
 * Overflow is NOT the same as the end-around carry firing. It's detected
 * separately, after any end-around correction, as the final sign digit
 * being something other than 0 or 9 — the only situation a real digit
 * position can end up out of range is genuine overflow (verified by hand
 * against I.2's examples; e.g. +7 + +6 never triggers an end-around carry
 * at all, it just leaves an invalid "1" in the sign position).
 */
function ripple(a: readonly Digit[], b: readonly Digit[]): { digits: Digit[]; overflow: boolean } {
  const plainAdd = (x: readonly Digit[], y: readonly Digit[]): { digits: Digit[]; carryOut: 0 | 1 } => {
    const digits: Digit[] = new Array(x.length);
    let carry = 0;
    for (let i = x.length - 1; i >= 0; i--) {
      const sum = x[i]! + y[i]! + carry;
      digits[i] = (sum % 10) as Digit;
      carry = sum >= 10 ? 1 : 0;
    }
    return { digits, carryOut: carry as 0 | 1 };
  };

  let { digits, carryOut } = plainAdd(a, b);
  if (carryOut === 1) {
    // End-around carry: add 1 back in at the rightmost digit and re-ripple.
    const one: Digit[] = new Array(digits.length).fill(0) as Digit[];
    one[one.length - 1] = 1;
    ({ digits } = plainAdd(digits, one));
    // A second carry-out here would mean the correction itself overflowed,
    // which shouldn't happen for well-formed same-length inputs; if it ever
    // does, the sign-digit check below still catches it.
  }
  const overflow = digits[0] !== 0 && digits[0] !== 9;
  return { digits, overflow };
}

/** 9's complement, digit-wise, sign digit included. Always succeeds. */
function complement(digits: readonly Digit[]): Digit[] {
  return digits.map((d) => (9 - d) as Digit);
}

/**
 * Shift the magnitude digits (everything after the sign) left (positive) or
 * right (negative) by `shift` places, discarding whatever falls off one end
 * and filling the vacated positions at the other. This is the shift the
 * 08n00 orders select (I.12) and the mechanism multiply/divide step
 * through digit-by-digit; the sign digit position itself is untouched.
 *
 * Vacated positions are filled with the SIGN digit's value (0 or 9), not
 * unconditionally 0 — this is another instance of the sign-extension point
 * from `DWord.embed`: shifting a value is scaling it by a power of ten, and
 * for a negative (9's-complement) number, "new digit worth nothing extra"
 * means 9, not 0. Checked by hand: -0.2 shifted one place right must equal
 * -0.02, not the (wrong) value zero-filling produces.
 */
function shiftMagnitude(digits: readonly Digit[], shift: number): Digit[] {
  if (shift === 0) return [...digits];
  const width = digits.length;
  const fill = digits[0]! === 9 ? 9 : 0;
  const result: Digit[] = new Array(width).fill(fill) as Digit[];
  result[0] = digits[0]!; // sign untouched
  // Positive shift moves digits toward the sign (more significant, x10^shift);
  // negative moves them away (less significant, /10^|shift|). A digit ending
  // up at result position j came from original position j + shift.
  for (let i = 1; i < width; i++) {
    const from = i + shift;
    if (from >= 1 && from < width) result[i] = digits[from]!;
  }
  return result;
}

function parseDigits(width: number, digits: readonly number[], label: string): Digit[] {
  if (digits.length !== width) {
    fail(`${label} must have exactly ${width} digits, got ${digits.length}`);
  }
  for (const d of digits) {
    if (!Number.isInteger(d) || d < 0 || d > 9) {
      fail(`${label} digits must each be an integer 0-9, got ${d}`);
    }
  }
  if (digits[0] !== 0 && digits[0] !== 9) {
    fail(`${label} sign digit (position 0) must be 0 or 9, got ${digits[0]}`);
  }
  return digits as Digit[];
}

function parseParts(width: number, sign: SignDigit, magnitude: string, label: string): Digit[] {
  // SignDigit already restricts this at the type level for in-TS callers,
  // but this is a public entry point (JSON, a JS caller, an `as` cast could
  // all bypass that) and parseDigits validates its own sign digit
  // explicitly — this should too, for the same reason.
  if (sign !== "0" && sign !== "9") {
    fail(`${label} sign must be '0' or '9', got ${JSON.stringify(sign)}`);
  }
  if (magnitude.length !== width - 1 || !/^\d+$/.test(magnitude)) {
    fail(`${label} magnitude must be exactly ${width - 1} decimal digits, got ${JSON.stringify(magnitude)}`);
  }
  return [Number(sign) as Digit, ...[...magnitude].map((c) => Number(c) as Digit)];
}

function parseString(width: number, s: string): Digit[] {
  let negative = false;
  let digitString: string;

  if (/^[+-]?\d+\.\d+$/.test(s)) {
    //Optional sign, D.DDDD....
    negative = s[0] === "-";
    digitString = s.replace(/[+-]|\./g, "");
  } else if (/^[+-]?\d+$/.test(s)) {
    //Optional sign, DDDDD...
    negative = s[0] === "-";
    digitString = s.replace(/^[+-]/, "");
  } else if (/^\*\d{5}$/.test(s)) {
    //* followed by 5 digits
    digitString = s.slice(1);
  } else {
    throw new Error(`Invalid format: ${s}`);
  }

  if (digitString.length > width) {
    throw new Error(`Value "${s}" exceeds width ${width}`);
  }

  return [
    negative ? 9 : 0, //
    ...digitString.split("").map(Number), //
    ...Array(width - digitString.length).fill(0), //
  ];
}

/**
 * Shared base for Word and DWord: a fixed-width, immutable digit array with
 * a sign digit at position 0. Holds everything that doesn't depend on the
 * two types' different widths (sign, negate, equality, string form); each
 * subclass adds its own `add`, sized to its own width.
 */
abstract class DigitValue {
  protected readonly digits: readonly Digit[];

  protected constructor(digits: readonly Digit[]) {
    this.digits = Object.freeze([...digits]);
  }

  /** The sign digit: '0' (+) or '9' (-). */
  get sign(): SignDigit {
    return String(this.digits[0]) as SignDigit;
  }

  get isNegative(): boolean {
    return this.digits[0] === 9;
  }

  toString(): string {
    let ret = this.isNegative ? "-" : "+";
    ret += this.digits[1];
    ret += ".";
    ret += this.digits.slice(2).join("");
    return ret;
  }

  /** Same width and same concrete type (Word with Word, DWord with DWord) only. */
  equals(other: this): boolean {
    return this.digits.every((d, i) => d === other.digits[i]);
  }

  /**
   * True if this is either representation of zero — all zeros (+0) or all
   * nines (-0) (III.6). Needed because `isNegative` alone (sign digit = 9)
   * can't tell -0 apart from a genuine negative value; III.6's own
   * roundabout zero-test recipe (add the positive modulus into a -0 store
   * and check the sign) exists for exactly this reason.
   */
  get isZero(): boolean {
    return this.digits.every((d) => d === 0) || this.digits.every((d) => d === 9);
  }

  /**
   * Escape hatch for a subclass to read ANOTHER instance's digits. Needed
   * because Word and DWord are sibling subclasses of DigitValue, not one
   * derived from the other — TS's `protected` only lets a subclass access
   * another object's protected member when that object's static type is
   * the accessing class or one of ITS subclasses, so DWord's own methods
   * can't do `word.digits` directly for a `word: Word` parameter. Routing
   * through this base-class static method (inherited by both) sidesteps that.
   */
  protected static digitsOf(value: DigitValue): readonly Digit[] {
    return value.digits;
  }

  /**
   * Shared implementation behind every `add`/`addWord`: shift `otherDigits`
   * and ripple-add it against this value's own digits. Pulled out here so
   * Word.add, DWord.add and DWord.addWord (which also has to embed a Word
   * first) share one implementation instead of three near-identical copies.
   */
  protected addDigits(otherDigits: readonly Digit[], shift: number): { digits: Digit[]; overflow: boolean } {
    return ripple(this.digits, shiftMagnitude(otherDigits, shift));
  }
}

export class Word extends DigitValue {
  static readonly WIDTH = 9; // sign + 8 magnitude digits (I.4)

  private constructor(digits: readonly Digit[]) {
    super(digits);
  }

  static fromString(s: string) {
    return new Word(parseString(Word.WIDTH, s));
  }

  static fromDigits(digits: readonly number[]): Word {
    return new Word(parseDigits(Word.WIDTH, digits, "Word"));
  }

  /** Build from a sign and the 8 magnitude digits, e.g. `Word.fromParts("0", "12100000")` for 1.21. */
  static fromParts(sign: SignDigit, magnitude: string): Word {
    return new Word(parseParts(Word.WIDTH, sign, magnitude, "Word"));
  }

  /** All-`sign` value: +0 (all zeros) or -0 (all nines) (III.6). */
  static zero(sign: SignDigit = "0"): Word {
    return Word.fromParts(sign, sign.repeat(Word.WIDTH - 1));
  }

  get magnitudeDigits(): readonly Digit[] {
    return this.digits.slice(1);
  }

  add(other: Word, shift = 0): ArithResult<Word> {
    const { digits, overflow } = this.addDigits(other.digits, shift);
    return { result: new Word(digits), overflow };
  }

  negate(): Word {
    return new Word(complement(this.digits));
  }
}

export class DWord extends DigitValue {
  static readonly WIDTH = 16; // sign + 15 magnitude digits — the accumulator (I.4's "09")

  private constructor(digits: readonly Digit[]) {
    super(digits);
  }

  static fromString(s: string) {
    return new DWord(parseString(DWord.WIDTH, s));
  }

  static fromDigits(digits: readonly number[]): DWord {
    return new DWord(parseDigits(DWord.WIDTH, digits, "DWord"));
  }

  static fromParts(sign: SignDigit, magnitude: string): DWord {
    return new DWord(parseParts(DWord.WIDTH, sign, magnitude, "DWord"));
  }

  static zero(sign: SignDigit = "0"): DWord {
    return DWord.fromParts(sign, sign.repeat(DWord.WIDTH - 1));
  }

  get high(): Word {
    return Word.fromDigits(this.digits.slice(0, 9));
  }

  get low(): Word {
    return Word.fromDigits([
      this.digits[0], //Sign Digits
      ...this.digits.slice(0, 16), //Last seven
    ]);
  }

  /**
   * Embed a Word's digits at this DWord's width: same sign and leading 8
   * magnitude digits, with the 7 new low-order positions filled with the
   * sign digit's own value — this is the sign-extension the file comment
   * corrects. Zero-fill only happens to work for positive words; for a
   * negative Word it must be 9s, or the embedded value is wrong (checked
   * by hand: -1.21 as a Word is 987899999; zero-padded to 16 digits that's
   * NOT -1.21 at 15-digit precision, but nine-padded it is).
   */
  private static embed(word: Word): Digit[] {
    const fill = word.sign === "9" ? 9 : 0;
    return [...DWord.digitsOf(word), ...(new Array(DWord.WIDTH - Word.WIDTH).fill(fill) as Digit[])];
  }

  /** Add a same-width DWord (accumulator + accumulator-shaped value). */
  add(other: DWord, shift = 0): ArithResult<DWord> {
    const { digits, overflow } = this.addDigits(other.digits, shift);
    return { result: new DWord(digits), overflow };
  }

  /**
   * Add a Word (store-width value) into this DWord, e.g. reading a store
   * into the accumulator, or an 08n00-shifted add/subtract (I.12) — shift
   * follows the order's table (A=+1 ... J=-7), and unlike a Word-into-Word
   * shift, digits pushed right land in the accumulator's extra low-order
   * positions instead of being discarded ("the right hand digits are
   * discarded unless the receiving store is the accumulator", I.12).
   */
  addWord(word: Word, shift = 0): ArithResult<DWord> {
    const { digits, overflow } = this.addDigits(DWord.embed(word), shift);
    return { result: new DWord(digits), overflow };
  }

  negate(): DWord {
    return new DWord(complement(this.digits));
  }
}

/**
 * Multiply: accumulator += multiplicand x multiplier; multiplier register
 * is cleared (I.6). Implemented as sign-magnitude shift-and-add: negate to
 * positive magnitudes, run the digit-serial multiply, then reintroduce sign
 * via negation of the accumulated product if needed.
 *
 * Deliberately NOT reproduced: I.6's negative-multiplier "overshoot",
 * where the real hardware processes a negative multiplier one digit
 * "too negative" plus a correction at the next position, and can hit a
 * transient overflow-stop even when the true product is in range (its own
 * example, (+3)x(-3), is given as stopping mid-calculation). That's a
 * specific hardware quirk, not a math requirement — this function computes
 * the mathematically correct product instead. Flagging in case bit-for-bit
 * quirk fidelity ever matters to you; it'd be a separate implementation
 * path, not a tweak to this one.
 */
export function multiply(
  accumulator: DWord,
  multiplicand: Word,
  multiplier: Word,
): { accumulator: DWord; multiplier: Word; overflow: boolean } {
  const negative = multiplier.isNegative;
  const magnitudeMultiplier = negative ? multiplier.negate() : multiplier;
  const effectiveMultiplicand = negative ? multiplicand.negate() : multiplicand;

  let acc = accumulator;
  let overflow = false;
  const digits = magnitudeMultiplier.magnitudeDigits; // 8 digits, position 1 = units
  for (let position = 0; position < digits.length; position++) {
    const shift = -position; // position 0 (units) -> shift 0; position 7 -> shift -7
    const count = digits[position]!;
    for (let k = 0; k < count; k++) {
      const step = acc.addWord(effectiveMultiplicand, shift);
      acc = step.result;
      overflow ||= step.overflow;
    }
  }

  // "If the multiplier was negative the register address will be cleared to
  // -0" (III.4(g)); positive multiplier clears to +0 (III.6).
  const clearedMultiplier = Word.zero(negative ? "9" : "0");

  return { accumulator: acc, multiplier: clearedMultiplier, overflow };
}

/**
 * Divide: accumulator (dividend) / divisor -> quotient, with the remainder
 * left in the accumulator (I.7). Digit-serial restoring division: at each
 * of the 8 quotient digit positions, subtract the (shifted) divisor out of
 * the remainder as many times as it fits (0-9) without going negative.
 *
 * Two assumptions the manual doesn't spell out, flagged rather than
 * guessed silently: the quotient's sign follows the usual same-sign-is-
 * positive rule (dividend sign XOR divisor sign), and the remainder keeps
 * the dividend's original sign.
 *
 * Deliberately NOT reproduced: the "dividend must not be +0" hardware stop
 * (I.7) — since we return a fresh quotient rather than mutating a
 * register in place, "must be pre-cleared" doesn't apply to this function
 * either, for the same reason. A +0 dividend is mathematically fine here
 * (quotient and remainder both come out +0); if you want the real
 * machine's stop-on-+0-dividend behavior, that's a precondition check the
 * caller (dispatch layer) should make before calling this, not something
 * baked into the math.
 *
 * I originally wrote here that I.7's "-1 error in the 7th decimal place"
 * quirk on exact divisions was also deliberately not reproduced. That
 * turned out to be wrong in an interesting way: my first draft of this loop
 * used `isNegative` (sign digit 9) to detect "that subtraction went too
 * far" — but -0 also has sign digit 9, so an exact division (one that lands
 * on -0 rather than +0) was mistaken for having gone negative, undercounting
 * the last quotient digit by one and leaving a spurious remainder. That's
 * the manual's quirk exactly, arrived at by accident. Fixed below by using
 * `isZero` (which recognizes both zero representations) instead of
 * `isNegative`, so this now returns the true, exact quotient for exact
 * divisions, as originally intended.
 *
 * Also handled: a quotient whose true magnitude is >= 10 doesn't fit an
 * 8-digit register at all (I.2's range check applies to the quotient same
 * as any other value) — `overflow` covers this too, found the same way, by
 * fuzzing against a bigint oracle rather than by inspection.
 */
export function divide(accumulator: DWord, divisor: Word): { quotient: Word; remainder: DWord; overflow: boolean } {
  const dividendNegative = accumulator.isNegative;
  const divisorNegative = divisor.isNegative;
  const magnitudeDivisor = divisorNegative ? divisor.negate() : divisor;
  const negatedDivisor = magnitudeDivisor.negate(); // used to subtract via add()

  let remainder = dividendNegative ? accumulator.negate() : accumulator;
  let overflow = false;
  const quotientDigits: Digit[] = [];

  for (let position = 0; position < 8; position++) {
    const shift = -position;
    let count = 0;
    while (count < 9) {
      const step = remainder.addWord(negatedDivisor, shift);
      overflow ||= step.overflow;
      // Stop once subtracting again would go genuinely negative — but not
      // for landing exactly on -0, which is zero, not negative (see above).
      if (step.result.isNegative && !step.result.isZero) break;
      remainder = step.result;
      count++;
    }
    quotientDigits.push(count as Digit);
    if (position === 0 && count === 9) {
      // The units digit hit its cap of 9 — check whether a 10th subtraction
      // would *also* have succeeded, meaning the true quotient magnitude is
      // >= 10 and doesn't fit in an 8-digit register at all (I.2's range
      // check), as opposed to a units digit that's legitimately 9 (e.g.
      // quotient 9.9999999, perfectly valid). Found by fuzzing against a
      // bigint oracle — this case is easy to hit (any dividend/divisor pair
      // whose true ratio is >= 10) and the loop previously just silently
      // returned a truncated, wrong 8-digit result with overflow left false.
      const trial = remainder.addWord(negatedDivisor, shift);
      if (!trial.result.isNegative) overflow = true;
    }
  }

  const quotientNegative = dividendNegative !== divisorNegative;
  // quotientDigits are raw positive magnitude values from the repeated
  // subtraction above, not already complement-encoded, so build the Word as
  // positive first and negate afterward if needed — negating a sign digit
  // baked in here as well would double-apply the sign onto non-complemented
  // digits and produce garbage (caught by testing this exact case).
  const magnitudeQuotient = Word.fromDigits([0, ...quotientDigits]);
  const quotient = quotientNegative ? magnitudeQuotient.negate() : magnitudeQuotient;
  const signedRemainder = dividendNegative ? remainder.negate() : remainder;

  return { quotient, remainder: signedRemainder, overflow };
}
