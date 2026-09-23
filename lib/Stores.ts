import { Word } from "./word";
import { type Address } from "./types";

export const GROUP_COUNT = 9;
export const STORES_PER_GROUP = 10;

function validateAddress(a: number) {
  if (!Number.isInteger(a)) throw `${a} is an invalid store address, not an integer.`;
  if (a < 10 || a > 99) throw `${a} is an invalid store address, out of bounds.`;
  const group = Math.floor(a / 10);
  const store = a % 10;
  if (group > GROUP_COUNT) throw `Store ${a} is not present, no group ${group}.`;
  if (store >= STORES_PER_GROUP) throw `Store ${a} is not present, store not in group ${group}.`;
}

export class Stores {
  readonly stores: Word[][];

  constructor() {
    this.stores = [];
    for (let i = 0; i < GROUP_COUNT; i++) {
      const group = [];
      for (let j = 0; j < STORES_PER_GROUP; j++) {
        group.push(Word.zero());
      }
      this.stores.push(group);
    }
  }

  reset(): void {
    for (let i = 0; i < GROUP_COUNT; i++) {
      for (let j = 0; j < STORES_PER_GROUP; j++) {
        this.stores[i][j] = Word.zero();
      }
    }
  }

  read(address: Address): Word {
    validateAddress(address);
    return this.stores[Math.floor(address / 10) - 1][address % 10];
  }

  clear(address: Address): void {
    validateAddress(address);
    this.stores[Math.floor(address / 10) - 1][address % 10] = Word.zero();
  }

  write(address: Address, value: Word): void {
    validateAddress(address);
    this.stores[Math.floor(address / 10) - 1][address % 10] = value;
  }
}
