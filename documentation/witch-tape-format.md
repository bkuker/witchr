# WITCH Paper Tape Format

Source: *Notes on Programming and Operating*, 2nd edition (cited below as section numbers,
e.g. I.1), cross-checked against `technobaboo/witch-e` and `WITCH_On_A_Board`. Where a rule
is a decision made in conversation rather than something the manual states outright, it's
marked as such.

**Word-boundary rule adopted here:** exactly one space (or block marker) immediately
precedes each word — never a run of more than one. The manual never states this directly.
The best evidence for it: where the manual *does* want deliberate slack on the tape (a loop
splice, III.5), it reaches for a run of **Letters Shift** rows specifically, not extra
spaces — which only makes sense if a repeated space would be ambiguous (which one actually
starts the next word?) in a way Letters Shift, never used elsewhere as a word-start marker,
is not. That's inference, not a quoted rule, but it's the basis for the decision here.

---

## 1. What's on a tape

A tape is a sequence of **words** — either an *order* (an instruction) or a *number*
(operand data) — interspersed with **block markers** that give named jump points for search
orders. Programs and data live on the same kind of tape; nothing at the format level
distinguishes "a tape meant to hold orders" from "a tape meant to hold numbers" — it's
purely a matter of what the program executing against it expects to find there, and where
it points its readers and searches.

---

## 2. Word boundaries

Every word is introduced by exactly one **separator** — a space code, or a block marker —
immediately followed by the word's content, with no gap between the separator and the
content itself (I.1, I.2). There is no independent "end of word" marker; a reader
determines a word's end purely by having consumed the fixed number of digits its type
requires (§3). This makes the separator-plus-fixed-width read the *only* mechanism that
establishes where one word stops and the next begins.

**Notes**
- Because there's no explicit end marker, a word is only well-formed if its type is
  identified correctly (§3) and its fixed width is read exactly — a misread here doesn't
  produce one bad value, it desynchronizes the reader from every word boundary that follows,
  since there's nothing after a word to resynchronize against except luck or a search
  order's own block marker (see §5).
- A run of blank/space tape *between* words is not a defined construct under this format —
  reading resumes at the very next separator encountered, and only one is expected.

---

## 3. Word types

| Type | Written as | Total width after separator | How it's told apart from the others |
|---|---|---|---|
| Order | 5 digits, no sign | 5 characters | First character after the separator is a plain digit |
| Number (long form) | sign, then 8 digits | 9 characters | First character after the separator is `+` or `-` |
| Number (short form) | `*`, then 5 digits | 6 characters | First character after the separator is `*` |

- **Order** (I.1): digit 1 is the opcode; digits 2-3 and 4-5 are the source and dest
  addresses for arithmetic orders, or reinterpreted per the control-order table for `0`-led
  orders. See the companion order-set reference for the full opcode table.
- **Number, long form** (I.2): `+dddddddd` or `-dddddddd` — the general-purpose way to write
  a signed value, decimal point fixed after the first digit, giving a magnitude range of
  `10 > N > -10`.
- **Number, short form** (I.2): `*ddddd` — always positive, and equivalent to writing the
  long form with the last 3 digits zero-padded: `*12345` means the same value as
  `+12345000`. Originally meant for loading an order's own digit pattern into a store as
  data (an order and a 5-digit number are the same width, so this reads an order's exact
  digits straight into a store via the ordinary numeric-input path), but usable as a
  shorthand for any positive value whose last three decimal places are zero.

**Notes**
- The type-discriminating character (a plain digit vs. `+`/`-`/`*`) is what a reader must
  branch on immediately after every separator — there's no lookahead beyond that first
  character needed to know which of the three fixed widths to read.
- If a number's sign/asterisk character is missing or a digit is standing where a sign
  should be, or vice versa — the reader has no way to detect this from the malformed word
  alone. It will read whatever fixed width it *expected* for whatever type it *did*
  recognize, which — being reasoned from how the machine's negative-sign detection likely
  works (a specifically-punched signal for `-`, with `+` simply being its absence, a common
  convention for equipment of this era) rather than confirmed — most plausibly means an
  order's opcode digit read where a sign was expected gets silently treated as `+`. Either
  way the reader ends up consuming the wrong number of following digits, spilling into the
  next word and desynchronizing from every word boundary after it. This paragraph is
  reasoning, not a manual-confirmed mechanism.

---

## 4. Block markers

A block marker is one of ten distinct separator characters — `[0]` through `[9]` in text
form — physically punched as the complement of the corresponding digit's own hole pattern
(II.6). A marker can stand in for an ordinary space anywhere a separator is expected (I.1,
I.2), and additionally serves as the named target for search orders (`03brr`/`05brr`, I.10),
which scan a given reader until they find the marker matching digit `b`.

**Notes**
- A tape need not be *loaded* with its first marker at the physical read head — the two
  hardwired startup orders (`03101` then `02101`, I.3) mean execution always begins by
  searching reader 01 for block `1`, wherever on the tape that happens to sit.
- Searching for a marker that doesn't exist on the loaded tape hangs indefinitely; searching
  in general is guarded by a timeout that alarms if no separator is found within ~30 seconds,
  or if one persists longer than that (I.10) — a signal that the reader treats an
  unreasonably long run of non-word tape as an anomaly during a search, even though ordinary
  sequential reading (§2) has no equivalent tolerance built in.
- Ten markers total means at most ten distinct named jump points are available per tape at
  once; a program needing more structure than that has to reuse marker numbers across
  different sections it can prove won't be searched for concurrently, or spread sections
  across separate reader-loaded tapes instead (III.1, III.2).

---

## 5. Tape-level structure

These aren't part of the word format itself, but they're how words on a physical tape are
organized into a usable program or data tape.

- **Identification header.** Real tapes carried an identification number at the physical
  head, encoding which reader the tape belongs in, which programme it's part of, and a
  revision/"Mark No." (III.5) — meant for a human sorting and loading tapes correctly, not
  parsed as a word by the machine. Since execution starts with a search for block `1` rather
  than a sequential read from physical tape-start, content before that marker is simply
  never reached by normal execution; the header lives there by construction, not because
  anything skips over it deliberately.
- **Loop splicing.** A tape meant to run as a continuous loop needs no gap between its last
  order and its first, achieved either by repeating the first order at the tail or by
  perforating several rows of Letters Shift as physical slack for the splice join (III.5) —
  Letters Shift specifically, not repeated spaces, per this document's opening note.
- **Self-resynchronizing tapes.** The recommended convention (III.5) is to perforate an
  identification number at the head of *every* tape and a search-for-block-1 order at the
  *end* of every order tape, specifically so a splice join's exact position doesn't matter —
  only the feed holes need to line up, since execution will search past whatever slack is
  there to find block 1 regardless.
- **Multiple readers, one program.** A program isn't limited to one tape — up to seven
  readers (addresses `01`-`07`) can each hold a separate loop, with `02`-prefixed orders
  moving control between them and `01`-`07` addressable directly as numeric-input sources in
  arithmetic orders (I.5, I.9). Splitting frequently-reused sub-sequences onto their own
  reader avoids the wasted tape-passes of keeping everything on one loop with internal
  searches (III.1, III.2).

---

## Appendix: physical perforation codes (II.6)

For reference — visually reading or hand-correcting a physical tape. Holes are labeled
`a`-`e`; `a`/`b` sit on one side of the smaller feed hole, `c`/`d`/`e` on the other.

**Single-hole codes**

| Hole | Meaning |
|---|---|
| `a` | `+` sign |
| `b` | Line feed *(not used while preparing tapes)* |
| `c` | Space |
| `d` | Carriage return *(not used while preparing tapes)* |
| `e` | `-` sign |

**Two-hole codes — the ten digits**

| Code | Digit |
|---|---|
| `ba` | 0 |
| `ca` | 1 |
| `eb` | 2 |
| `db` | 3 |
| `dc` | 4 |
| `ec` | 5 |
| `ed` | 6 |
| `ad` | 7 |
| `ae` | 8 |
| `be` | 9 |

**Three-hole codes — block markers, the complement of the matching digit code** (e.g. block
marker `1` is `bde`, the complement of digit `1`'s `ac`)

**Four/five-hole special codes**

| Code | Meaning |
|---|---|
| `edeb` | Asterisk |
| `aedc` | Decimal point *(not used while preparing tapes)* |
| `baed` | Figures shift |
| `cbae` | Letter "N" only *(not used while preparing tapes)* |
| `deba` | Letter-only shift *(not used while preparing tapes)* |
| all five holes | Letters shift (also used for erasures — see §5's loop-splicing note) |
