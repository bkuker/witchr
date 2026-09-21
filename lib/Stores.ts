export const GROUP_COUNT = 9;
export const STORES_PER_GROUP = 10;

function validateAddress(a: number) {
  if (!Number.isInteger(a)) throw `${a} is an invalid store address, not an integer.`;
  if (a < 10 || a > 99) throw `${a} is an invalid store address, out of bounds.`;
  let group = Math.floor(a / 10);
  let store = a % 10;
  if (group > GROUP_COUNT) throw `Store ${a} is not present, no group ${group}.`;
  if (store >= STORES_PER_GROUP) throw `Store ${a} is not present, store not in group ${group}.`;
}

export class Stores {
  readonly stores: number[][];

  constructor() {
    this.stores = [];
    for (let i = 0; i < GROUP_COUNT; i++) {
      let group = [];
      for (let j = 0; j < STORES_PER_GROUP; j++) {
        group.push(0);
      }
      this.stores.push(group);
    }

    this.write(57, 99999991);
    this.write(67, -99999991);
  }

  reset(): void {
    for (let i = 0; i < GROUP_COUNT; i++) {
      for (let j = 0; j < STORES_PER_GROUP; j++) {
        this.stores[i][j] = 0;
      }
    }
  }

  read(address: number): number {
    validateAddress(address);
    return this.stores[Math.floor(address / 10) - 1][address % 10];
  }

  write(address: number, value: number): void {
    this.stores[Math.floor(address / 10) - 1][address % 10] = value;
  }
}
