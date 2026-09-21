export function toWord(s: string): number {
  let i = parseInt(s); //TODO Other Types
  i = Math.min(i, 99999999);
  i = Math.max(i, -99999999);
  return i;
}
