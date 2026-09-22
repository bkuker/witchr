import { fail, checkInt } from "./types";

export class Accumulator {
  value: number = 0;

  get low7(): number {
    throw "TODO";
  }

  set low7(val: number) {
    throw "TODO";
  }

  get asString(): string {
    return (this.value < 0 ? "-" : "+") + Math.abs(this.value).toString().padStart(15, "0");
  }

  set asString(val: string) {
    this.value = Number.parseInt(val);
  }
}
