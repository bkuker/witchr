import { fail, checkInt, type Address, type Layout } from "./types";
import { Word } from "./word";

export class Printer {
  text = "";

  print(val: Word, layout: Layout): void {
    let txt = "";
    switch (layout) {
      case 3:
        txt = eight(val) + "     ";
        break;
      case 4:
        txt = eight(val) + "\n";
        break;
      case 5:
        txt = eight(val) + "\n\n";
        break;
      case 6:
        txt = six(val) + "      ";
        break;
      case 7:
        txt = six(val) + "     ";
        break;
      case 8:
        txt = six(val) + "\n";
        break;
      case 9:
        txt = six(val) + "\n\n";
        break;
      case 0:
        txt = "\n\n\n\n\n";
    }

    this.text += txt;
  }
}

function eight(v: Word): string {
  return v.toString().substring(0, 11);
}

function six(v: Word): string {
  return v.toString().substring(0, 9);
}
