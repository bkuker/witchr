/** What a tape reader does when it reaches the end of its tape. */
export enum TapeMode {
  /** Runs off the end: after the last line there is nothing left to read. */
  Straight,
  /** Ends are joined: after the last line it wraps back to the first. */
  Looped,
}

/**
 * One tape reader's tape: an ordered list of lines and a read position.
 *
 * Blank lines are never meaningful and are discarded on construction (a
 * line is blank if it's empty after trimming), so every line a Tape holds is
 * non-blank. Any other filtering a caller wants (stripping comments, etc.)
 * happens before the lines ever get here.
 *
 * The lines are never modified; only `position` moves. That is different
 * from the original emulator, which consumed (Straight) or rotated (Looped)
 * the text itself, so resetting is just rewinding the position.
 */
export class Tape {
  readonly lines: readonly string[];
  mode: TapeMode;

  /**
   * Index of the current line, or `undefined` when nothing is under the
   * reader: an empty tape, or a Straight tape that has run off the end.
   */
  position: number | undefined;

  constructor(lines: readonly string[], mode: TapeMode = TapeMode.Straight) {
    // Trimming also drops the stray '\r' left over from Windows line endings.
    this.lines = lines.map((line) => line.trim()).filter((line) => line !== "");
    this.mode = mode;
    this.position = this.lines.length > 0 ? 0 : undefined;
  }

  /** Build a tape from the raw text of a file or textarea. */
  static fromText(text: string, mode: TapeMode = TapeMode.Straight): Tape {
    return new Tape(text.split(/\r?\n/), mode);
  }

  /** Rewind to the first line (or to nothing, if the tape is empty). */
  reset(): void {
    this.position = this.lines.length > 0 ? 0 : undefined;
  }

  /**
   * The line under the reader, or `undefined` if there isn't one (an empty
   * tape, or a Straight tape that has run out).
   */
  current(): string | undefined {
    return this.position === undefined ? undefined : this.lines[this.position];
  }

  /**
   * Move to the next line. At the end, a Straight tape runs off (`position`
   * becomes `undefined`) and a Looped tape wraps back to the first line.
   *
   * @returns true if there is a current line after advancing.
   */
  advance(): boolean {
    if (this.position === undefined) return false;

    if (this.position + 1 < this.lines.length) {
      this.position += 1;
    } else {
      this.position = this.mode === TapeMode.Looped ? 0 : undefined;
    }
    return this.position !== undefined;
  }
}
