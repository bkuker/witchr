# WITCH Order Set Reference

Source: *Notes on Programming and Operating*, 2nd edition (the manual, cited below as
section numbers like I.5), cross-checked against `technobaboo/witch-e` and
`WITCH_On_A_Board`. Terminology note: the manual says "sending address" and "receiving
address" throughout — this document uses **source** and **dest** instead, and pseudocode
like `dest += src` to describe each effect concretely. Every order is 5 digits.

---

## 1. Arithmetic Operations

Format: `A ss rr` — opcode digit, source address `ss`, dest address `rr`.

| Opcode | Name | Effect |
|---|---|---|
| `1` | Add and hold | `dest += src` |
| `2` | Add and clear | `dest += src; src = 0` |
| `3` | Subtract and hold | `dest -= src` |
| `4` | Subtract and clear | `dest -= src; src = 0` |
| `5` | Multiply | `acc += src * dest; dest = 0` |
| `6` | Divide | `dest = acc / src; acc = remainder` |
| `7` | Positive modulus | `dest += abs(src)` |

**Notes**
- Source and dest must not be in the same group of ten stores, except the specific 00-09
  exceptions listed in §3 below — and none of those exceptions may use opcode `2` or `4`
  (I.5: *"'Add and Clear' or 'Subtract and Clear' orders are not permitted with these
  combinations of addresses"*).
- Any result whose true magnitude reaches 10 stops the machine (`10 > N > -10`, I.2).
- **Multiply**: `src` is the multiplicand, `dest` is the multiplier register — it's *read
  first, then cleared*, to `+0` if it had been positive, `-0` if negative (III.4(g), III.6).
  The product accumulates onto whatever the accumulator already holds; it isn't overwritten.
  A negative multiplier is processed one digit at a time with a documented "overshoot" (I.6):
  each digit is handled as one unit too negative, corrected by adding one unit back — which
  can trip a transient overflow stop even when the true product is in range. Not modeled in
  the current `word.ts`.
- **Divide**: the dividend is implicit — whatever's currently in the accumulator, not an
  addressed operand. `dest` (the quotient register) must be pre-cleared beforehand, since
  each of its digits is computed independently with no carry-over correction between them
  (I.7). The remainder is left in the accumulator afterward, overwriting the dividend.
  There's no cap on how many times a single digit's repeated subtraction can run — an
  oversized quotient doesn't trip an immediate stop, it just runs for a very long time until
  the general inactivity alarm eventually catches it (I.7's own example: a quotient of 1000
  takes about 45 seconds).
- A `+0` dividend (all zeros) stops the machine with no diagnostic; a `-0` dividend (all
  nines) is fine (I.7) — asymmetric, and the manual doesn't explain the mechanism.
- An exact division of a **positive** dividend is documented to come out with a -1 error in
  the 7th decimal, leaving a stray remainder; a negative dividend's exact division is always
  correct (I.7) — also asymmetric, also unexplained in the source.

---

## 2. Control Operations

Format: `0 x y` — every control order's first digit is `0`.

| Order | Name | Effect |
|---|---|---|
| `00000` | No-op | Ignored; proceed to the next order (I.13) |
| `00100` | Finish | Passes through if the Pass Finish key is held; otherwise lights the Finish lamp and eventually triggers the inactivity alarm. Resets the delayed-alarm restart count. |
| `00200` | Signal | Same as Finish, gated by the Pass Signal key instead. Does **not** reset the delayed-alarm count. |
| `011dd` | Sign test (+) | sign-test flag = true if `dd`'s sign digit is `+` |
| `012dd` | Sign test (-) | sign-test flag = true if `dd`'s sign digit is `-` |
| `021rr` | Transfer control | Unconditional; control moves to reader `rr`, or to a store, in which case successive stores are read as orders until another `02` (I.9, III.3) |
| `022rr` | Transfer control (conditional) | As above, only if the sign-test flag is true; if false, falls through to the next order; if no sign test has ever run, **the machine stops** |
| `03brr` | Search (unconditional) | Reader `rr` searches for block marker `b` |
| `05brr` | Search (conditional) | As above, only if the sign-test flag is true; else falls through |
| `07n` | Set output layout | Selects one of 10 print/punch layouts (below) for subsequent output |
| `08n00` | Set shift | One-shot: applies a shift (below) to the *next* opcode `1`/`3`/`7` order only, then reverts to straight-through |

**Notes**
- `022` needs a prior sign test to mean anything; running it cold stops the machine rather
  than defaulting either way.
- Search guard: alarms if no space code is found within ~30s, or one persists >30s.
  Searching for a block marker that doesn't exist on the tape hangs indefinitely (I.10).
- A layout must be selected before *any* output can occur (I.11).
- The `08` shift skips right over any input, output, multiply, or divide orders that happen
  to fall between it and the `1`/`3`/`7` order it targets (I.12) — they don't consume or
  clear the pending shift.
- With a shift active, the targeted order can't be the "and clear" variant (I.12).

### 2a. Output layouts (`07n`)

| `n` | Format |
|---|---|
| `0` | Feed 5 blank rows (no digits) |
| `1` | Punch: 8 digits |
| `2` | Punch: 5 digits + asterisk |
| `3` | Print: 8 digits, 5 columns/line, first-or-middle column |
| `4` | Print: 8 digits, last on line |
| `5` | Print: 8 digits, last on line, + blank line after |
| `6` | Print: 6 digits, 6 columns/line, first-or-middle column |
| `7` | Print: 6 digits, 5 columns/line, first-or-middle column |
| `8` | Print: 6 digits, last on line |
| `9` | Print: 6 digits, last on line, + blank line after |

### 2b. Shifts (`08n00`)

| `n` | Letter | Factor |
|---|---|---|
| `1` | A | ×10 |
| `2` | B | ×1 (straight-through — the default) |
| `3` | C | ×10⁻¹ |
| `4` | D | ×10⁻² |
| `5` | E | ×10⁻³ |
| `6` | F | ×10⁻⁴ |
| `7` | G | ×10⁻⁵ |
| `8` | H | ×10⁻⁶ |
| `9` | J | ×10⁻⁷ |

**Notes**
- Shift A discards the source's leftmost digit entirely — it is *not* folded into the sign —
  before the rest shifts one place more significant.
- Shifts C-J discard digits off the right end — **except** when the dest is the
  accumulator, where they land in its extra low-order positions instead of being lost
  (I.12; see §3's address `08` row).

---

## 3. Special Addresses 00-09: Source / Dest Behavior

| Addr | As Source | As Dest |
|---|---|---|
| `00` | Round-off circuit: a fresh random `0` or `1` each read, signed to match whatever it's being added into. Lands in the 7th decimal by default, or wherever an active shift redirects it (I.14). | Drain — discards whatever is sent (I.4) |
| `01` | Tape reader 1 | Printer |
| `02` | Tape reader 2 | Perforator |
| `03` | Tape reader 3 | Printer |
| `04` | Tape reader 4 | Perforator |
| `05`-`07` | Tape readers 5-7 | Spare |
| `08` | Accumulator's last 7 digits, with the accumulator's own sign. Read raw, it needs ×10⁸ to reflect its true contribution (I.4). | Accumulator's last 7 digits: the sent value's leading 7 digits land here, scaled ×10⁻⁸; its 8th (smallest) digit has nowhere to go and is discarded. *(Derived, not manual-stated — see note below.)* |
| `09` | Whole accumulator, all 16 digits | Whole accumulator, all 16 digits |

**Notes**
- Addresses `01`-`07` are the machine's 7 tape readers; `10`-`99` are the general stores.
- Same-group-restriction exceptions specifically permitted within 00-09 (none may use
  opcode `2`/`4`): `00`→`09` (round the accumulator), `01`-`07`→`00` (read into the drain),
  `01`-`07`→`09` (read into the accumulator), `08`→`00` (drain the low 7 digits),
  `08`→`01`-`04` (print/punch the low 7 digits, ×10⁸), `09`→`00` (drain the accumulator),
  `09`→`01`-`04` (print/punch the first 8 digits) (I.4, I.5).
- It is not possible to print-and-clear — output orders can only be opcode `1`/`3` (I.5).
- Address `08` is the *only* way to reach the accumulator's lowest 7 digits at all, in
  either direction — stronger than anything the shift table can reach on its own (max
  ×10⁻⁷ via shift J). Reading `08` then `09` (or writing `08` then `09`) is how you'd split
  a full-precision accumulator value across two ordinary 8-digit stores, or reconstruct one
  back from them.
- The `08`-as-dest row is inference on my part, derived from the confirmed sending-side
  ×10⁸ relationship and the address table's own ditto mark rather than a directly-stated
  mechanism — flagged here rather than presented as quoted fact.
