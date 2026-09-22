import { fail, checkInt, type Address, type Layout } from "./types";

export class Printer {
  // --- Printer's mechanical last-character latch (I.11). ---
  private _printerLatch: string | undefined;

  /** The last character fed to the printer; re-printed when off and re-fed. */
  get printerLatch(): string | undefined {
    return this._printerLatch;
  }

  set printerLatch(value: string) {
    if (typeof value !== "string" || value.length !== 1) {
      fail(`printerLatch must be a single character, got ${JSON.stringify(value)}`);
    }
    this._printerLatch = value;
  }

  clearPrinterLatch(): void {
    this._printerLatch = undefined;
  }
}
