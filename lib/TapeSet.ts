import { Tape, TapeMode } from "./Tape";

/** How many tape readers there are. */
export const TAPE_COUNT = 4;

/**
 * The tapes for all the readers, in order: `tapes[0]` is tape 1.
 *
 * Always holds exactly TAPE_COUNT tapes; any the source didn't mention are
 * empty Straight tapes.
 *
 * Like Tape, this has no dependency on Vue or the DOM, so it can be used
 * from the web app, a CLI, or tests.
 *
 * Text format (see `fromText`): a file is a sequence of tapes, each starting
 * with a header line and followed by its lines.
 *
 *     tape1(straight)      <- number and mode
 *     [1]                  <- block marker: NOT the tape number; it's tape
 *     22000                   data like any other line, and a tape can have
 *     ...                     several of them
 *
 *     PTR2                 <- number only; no mode given, so Straight
 *     [2]
 *     11040
 *     ...
 *
 * A file with no header at all is a single tape, tape 1 (Straight).
 *
 * `fromText` throws a TapeSetParseError, rather than guessing, if a header
 * names a tape outside 1..TAPE_COUNT or names the same tape twice. (The [N]
 * block markers are just data and can repeat freely, within a tape or across
 * tapes; only tape headers must be unique.)
 */
export class TapeSet {
  readonly tapes: Tape[];

  /**
   * @param tapes Tapes for readers 1, 2, ... in order. Fewer than TAPE_COUNT
   *   is fine (the rest are empty); more is an error.
   */
  constructor(tapes: readonly Tape[] = []) {
    if (tapes.length > TAPE_COUNT) {
      throw new RangeError(`A TapeSet holds at most ${TAPE_COUNT} tapes, got ${tapes.length}`);
    }
    this.tapes = Array.from({ length: TAPE_COUNT }, (_, i) => tapes[i] ?? new Tape([]));
  }

  /**
   * Parse the raw text of a tape file.
   *
   * @throws TapeSetParseError if a header names a tape outside 1..TAPE_COUNT,
   *   or names a tape that an earlier header already named.
   */
  static fromText(text: string): TapeSet {
    // Pass 1: cut the text into sections, one per header line.
    const sections: Section[] = [];
    const beforeFirstHeader: string[] = [];
    const headerLineOf = new Map<number, number>(); // tape number -> line of its header
    let current: Section | undefined;

    for (const [index, raw] of text.split(/\r?\n/).entries()) {
      const line = raw.trim();
      const lineNumber = index + 1;

      const header = parseHeader(line);
      if (header) {
        if (header.number < 1 || header.number > TAPE_COUNT) {
          throw new TapeSetParseError(`tape ${header.number} is outside the range 1–${TAPE_COUNT}`, lineNumber);
        }
        const firstLine = headerLineOf.get(header.number);
        if (firstLine !== undefined) {
          throw new TapeSetParseError(`tape ${header.number} was already given on line ${firstLine}`, lineNumber);
        }
        headerLineOf.set(header.number, lineNumber);

        current = { ...header, lines: [] };
        sections.push(current);
        continue;
      }

      // Blank lines would be dropped by Tape anyway. Everything else,
      // including [N] block markers, is tape data.
      if (line === "") continue;

      (current ? current.lines : beforeFirstHeader).push(line);
    }

    // No headers at all: the whole file is tape 1. Otherwise anything ahead
    // of the first header is a preamble (title, licence, ...) and is ignored.
    // TODO: comments aren't handled yet; for now the preamble is just skipped.
    if (sections.length === 0) {
      sections.push({ number: 1, mode: TapeMode.Straight, lines: beforeFirstHeader });
    }

    // Pass 2: place each section at its tape number (unique and in range,
    // thanks to the checks above).
    const tapes: Tape[] = [];
    for (const section of sections) {
      tapes[section.number - 1] = new Tape(section.lines, section.mode);
    }

    // `tapes` may have holes; the constructor fills them with empty tapes.
    return new TapeSet(Array.from(tapes));
  }
}

/** The text couldn't be parsed into a TapeSet. */
export class TapeSetParseError extends Error {
  /** 1-based line of the text where the problem is. */
  readonly lineNumber: number;

  constructor(message: string, lineNumber: number) {
    super(`Line ${lineNumber}: ${message}`);
    this.name = "TapeSetParseError";
    this.lineNumber = lineNumber;
  }
}

// --- parsing helpers --------------------------------------------------------

interface TapeHeader {
  /** 1-based tape number, as written in the text. */
  number: number;
  mode: TapeMode;
}

interface Section extends TapeHeader {
  lines: string[];
}

/** `tape2(looped)`: number and mode. */
const TAPE_HEADER = /^tape\s*(\d+)\s*\(\s*(straight|looped)\s*\)$/i;
/** `PTR2`: number only. */
const PTR_HEADER = /^ptr\s*(\d+)$/i;

/** Read a (trimmed) line as a tape header, or `undefined` if it isn't one. */
function parseHeader(line: string): TapeHeader | undefined {
  const tape = TAPE_HEADER.exec(line);
  if (tape) {
    const mode = tape[2]?.toLowerCase() === "looped" ? TapeMode.Looped : TapeMode.Straight;
    return { number: Number(tape[1]), mode };
  }

  const ptr = PTR_HEADER.exec(line);
  if (ptr) {
    return { number: Number(ptr[1]), mode: TapeMode.Straight };
  }

  return undefined;
}
