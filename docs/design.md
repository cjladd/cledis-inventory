# Design notes

Who this is for: a line cook on a phone, in a hot kitchen, with wet hands and
about thirty seconds, scanning sixty items for the few that need doing. Some of
them read Spanish first. Every choice below serves that, not a dashboard.

## Tokens

Defined in `src/app/globals.css`, exposed to Tailwind in `tailwind.config.ts`.

| Token | Value | Use |
|---|---|---|
| `--ground` | `#f1f3f5` | Page. Cool, like steel and a clean prep table. |
| `--surface` | `#ffffff` | Rows and sheets |
| `--surface-sunk` | `#e7ebee` | Pressed states, secondary buttons |
| `--rule` | `#dce1e6` | Hairline dividers |
| `--ink` | `#17191c` | Text, nav rail, primary buttons |
| `--ink-2` / `--ink-3` | `#5a626b` / `#8b939c` | Secondary and tertiary text |
| `--amber` | `#e08900` | Prep, "low", the active nav tab |
| `--flame` | `#c3362c` | Waste, "critical", "out" |

**Colour only ever means stock status.** Nothing is tinted for decoration. That
is why the palette is cool everywhere except the two status colours — they have
to be the only warm thing on screen to carry urgency.

## Rules that are easy to break by accident

**OK is silent.** An item at level gets no colour and no badge. The old UI put a
green "In Stock" pill on every row, which meant fifty pills and nothing legible.
Status lives in the left spine (`.spine`), and the spine is transparent for `ok`.

**Quantity is the hero.** Every screen is really about a number and a unit. Use
`.tnum` (tabular figures) so quantities line up down a list, and the `quantity`
or `hero` font sizes. Par goes underneath, because par is what a prep count
works against.

**Rows, not cards.** Flat surfaces separated by `.rule-list` hairlines. No
gap-plus-shadow card grids — they halve what fits on a phone.

**Radius marks what you can touch.** Rows are square. Controls use
`rounded-control`, sheets use `rounded-sheet`.

**One motion moment.** The quantity sheet rising (`.animate-sheet`) and the wrong-PIN
shake. No section-entrance animations, no hover transitions on every row.
Both respect `prefers-reduced-motion`.

## Type

Archivo, one family, across weights 400–800. Chosen for its signage lineage and
real tabular figures. Headings are extrabold and tight; body is 15px, which is
the smallest that stays readable at arm's length.

Avoid: all-caps labels, an accent colour on one word of a heading, eyebrow
labels above headings, meta strings joined with middle dots.

## Copy

Active voice, sentence case, and the same word for an action all the way
through: the button says **Log prep**, the toast says **Logged**. Errors say what
to do next ("Check the kitchen tablet is on the wifi"), never just that something
failed. Empty states invite an action rather than reporting emptiness.

Name things the way the kitchen does — "Line cook", not "STAFF"; "Turn off", not
"Delete", because the action deactivates and keeps history.

## Shared components

- `PageHeader` — sticky title, one line of live context, optional search and action.
- `ListState` — the loading, failed and empty states for a list, in one place.
- `ItemCard` — the item row, with status spine and quantity.
- `QuantityModal` — the entry sheet. Shows the resulting total, so nobody does
  arithmetic mid-shift.

The app holds a 480px column (`AuthGuard`) so it reads as a phone even on the
kitchen tablet or a laptop.
