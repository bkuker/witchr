import { DWord, Word } from "./word";

export class Accumulator {
  value: DWord = DWord.zero();

  clear(): void {
    this.value = DWord.zero();
  }

  add(val: Word, shift: number = 0) {
    //TODO Overflow Check?
    this.value = this.value.addWord(val).result;
  }

  get asString(): string {
    return this.value.toString();
  }

  set asString(val: string) {
    this.value = DWord.fromString(val);
  }
}
