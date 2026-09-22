export function toWord(s: string): number {
  let i = parseInt(s); //TODO Other Types
  i = Math.min(i, 99999999);
  i = Math.max(i, -99999999);
  return i;
}

type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc["length"]]>;
type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>;

export type Address = IntRange<0, 100>;

export type Layout = IntRange<0, 10>;

export function toAddress(v: string): Address {
  const a = Number.parseInt(v);
  return a as Address;
}

export function fail(message: string): never {
  throw new RangeError(message);
}

export function checkInt(value: number, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`${label} must be an integer in [${min}, ${max}], got ${value}`);
  }
  return value;
}
