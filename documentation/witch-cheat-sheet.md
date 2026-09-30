# WITCH Order Set — Cheat Sheet

Terse reminders only. Full story → `witch-order-reference.md`.

`A ss rr` = opcode, source, dest. Control orders start with `0`.

---

## Arithmetic

| Op | Name | Precondition | Effect |
|---|---|---|---|
| `1` | Add, hold | diff. group (or 00-09 exc.) | `dest += src` |
| `2` | Add, clear | diff. group, not exc. pair; `shift==2` | `dest += src; src = 0` |
| `3` | Subtract, hold | diff. group (or 00-09 exc.) | `dest -= src` |
| `4` | Subtract, clear | diff. group, not exc. pair; `shift==2` | `dest -= src; src = 0` |
| `5` | Multiply | `src,dest ∉ 00-09` | `acc += src*dest; dest = 0` |
| `6` | Divide | `src,dest ∉ 00-09`; `dest==0`; `acc≠+0` | `dest = acc/src; acc = remainder` |
| `7` | Modulus, hold only | diff. group (or 00-09 exc.) | `dest += abs(src)` |

- `|result| >= 10` → stop.
- Negative multiplier: can transiently overflow even when the true product fits.
- Divide: no cap on attempts — oversized quotient just runs long, alarm eventually.
- Exact divide: positive dividend off by -1 in last digit; negative dividend exact.

---

## Control

| Order | Name | Precondition | Effect |
|---|---|---|---|
| `00000` | No-op | — | ignored |
| `00100` | Finish | — | Pass Finish held → continue; else lamp + eventual alarm; resets delayed-alarm count |
| `00200` | Signal | — | Pass Signal held → continue; else lamp + eventual alarm; doesn't reset delayed-alarm count |
| `011dd` | Sign test (+) | — | `flag = (dd is +)` |
| `012dd` | Sign test (-) | — | `flag = (dd is -)` |
| `021rr` | Transfer control | — | jump to `rr` (reader, or store — reads as orders until next `02`) |
| `022rr` | Transfer control, cond. | — | `flag` unset → **stop**; true → jump; false → next order |
| `03brr` | Search | — | search `rr` for block `b` |
| `05brr` | Search, cond. | — | `flag` true → search `rr` for `b`; false → next order |
| `07n` | Set output layout | — | `layout = n` |
| `08n00` | Set shift | — | `shift = n` for the next `1`/`3`/`7` only, then reverts to `2` |

- Search: `b` not on tape → hangs forever. Alarms if no separator in ~30s, or one persists >30s.
- `shift` isn't consumed by intervening input/output/multiply/divide orders.

**Layouts (`07n`)**

| n | Format |
|---|---|
| `0` | Feed 5 blank rows |
| `1` | Punch, 8 digits |
| `2` | Punch, 5 digits + `*` |
| `3` | Print, 8 digits, 5 cols, first/mid |
| `4` | Print, 8 digits, line end |
| `5` | Print, 8 digits, line end + blank line |
| `6` | Print, 6 digits, 6 cols, first/mid |
| `7` | Print, 6 digits, 5 cols, first/mid |
| `8` | Print, 6 digits, line end |
| `9` | Print, 6 digits, line end + blank line |

**Shifts (`08n00`)**

| n | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| Letter | A | B | C | D | E | F | G | H | J |
| Factor | ×10 | ×1 | ×10⁻¹ | ×10⁻² | ×10⁻³ | ×10⁻⁴ | ×10⁻⁵ | ×10⁻⁶ | ×10⁻⁷ |

- Shift A drops the leading digit (not into sign). C-J drop trailing digits — except into
  the accumulator, which has extra low digits to catch them instead.

---

## Addresses 00-09

| Addr | As source | As dest |
|---|---|---|
| `00` | round-off: random 0/1, sign auto-matched, 7th decimal by default | drain |
| `01` | reader 1 | printer (`layout` must be set) |
| `02` | reader 2 | perforator |
| `03` | reader 3 | printer (`layout` must be set) |
| `04` | reader 4 | perforator |
| `05`-`07` | readers 5-7 | spare |
| `08` | acc low 7 digits + acc sign (×10⁸ for true value) | acc low 7 digits, ×10⁻⁸ (8th digit dropped) *(derived)* |
| `09` | whole accumulator | whole accumulator |

- 00-09 exceptions (never opcode `2`/`4`): `00→09`, `01-07→00`, `01-07→09`, `08→00`,
  `08→01-04`, `09→00`, `09→01-04`.
- `08` is the only way to reach the accumulator's lowest 7 digits (beats any shift, max ×10⁻⁷).
