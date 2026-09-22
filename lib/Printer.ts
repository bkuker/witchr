import { fail, checkInt, type Address, type Layout } from "./types";

export class Printer {
  text = "";

  print(val: number, layout: Layout): void {
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

function eight(v: number): string {
  let n = v.toString().padStart(8, "0");
  let r = n.slice(0, 1) + "." + n.slice(1);
  let s = v >= 0 ? "+" : "-";
  return s + r;
}

function six(v: number): string {
  let n = v.toString().padStart(8, "0");
  n = n.substring(0, 7);
  let r = n.slice(0, 1) + "." + n.slice(1);
  let s = v >= 0 ? "+" : "-";
  return s + r;
}
