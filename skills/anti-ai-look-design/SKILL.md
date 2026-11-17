---
name: anti-ai-look-design
description: Concrete, checkable rules for app screens that look designed by a person, not generated - type scale, one accent, 4/8px grid, real content, no default gradients, no emoji icons, no glass by default, no all-centred hero, alignment, WCAG AA contrast, density per app type. Load before designing, reviewing or exporting a UI screen.
---

# Anti-AI-look design rules

Generated UI has a look: a purple-to-blue gradient hero, everything centred,
emoji as icons, frosted cards, "John Doe", five shades of five colours, and
the same three feature cards. People spot it in a second. These rules remove
those tells. Each rule has an id, a check you can run, and a fix.

`check_variant` (Design Studio MCP) runs the static checks marked **[auto]**.
The rest you judge from the screenshot (`render_variant`). A variant is ready
only when it has **no auto errors** and you can answer **yes** to every
**[look]** question.

## The design system comes first

Every project has a design system (`get_project` returns it). Use its tokens,
never raw Tailwind palette colours:

| Token class | Use |
|---|---|
| `bg-bg` | page background |
| `bg-surface` | cards, panels, inputs |
| `text-ink` | body text, headings |
| `text-muted` | secondary text, labels, meta |
| `border-line` / `divide-line` | every border and divider |
| `bg-accent` `text-accent-ink` | the one primary action; selected state |
| `text-accent` `border-accent` | links, focus, a key number |
| `font-sans` `font-display` `font-mono` | body / headings / numbers and code |
| `text-danger` `text-success` | status only: small text or a dot, never a card fill |
| `rounded-sm` `rounded-md` `rounded-lg` | the only radii |
| `text-xs` `text-sm` `text-base` `text-lg` `text-xl` `text-2xl` `text-3xl` `text-4xl` | the type scale, in order (default 12/14/16/18/20/24/32/44px). A shorter scale defines fewer classes; a class past its end draws nothing and is an error |

Neutrals for tinted fills: use `bg-ink/5`, `bg-accent/10`, never `bg-gray-100`.

## Rules

### R1 Type scale and hierarchy
- **[auto]** No arbitrary sizes (`text-[13px]`), no size class the scale does not define. Use 3-6 sizes per screen.
- **[look]** One element is clearly the most important; you can tell the
  reading order from size and weight alone.
- Two weights are usually enough (400 and 600). Bold is for emphasis, not
  every label.
- Headings tighten tracking (`tracking-tight`) at 24px and up. Labels and
  overlines may use `uppercase tracking-wide text-xs text-muted`, at most one
  kind per screen.
- Numbers in tables and stats: `font-mono` or `tabular-nums`, right-aligned in
  columns.

### R2 One accent
- **[auto]** No Tailwind palette hues (`blue-500`, `emerald-400` ...). Use the
  tokens. At most 2 hard-coded hex values (e.g. a chart series).
- **[look]** The accent appears on one primary action per view and a few
  small signals (active nav item, a key number, focus). If more than ~10% of
  the screen is accent colour, it is too much.
- Status uses the `danger` / `success` tokens, only as small dots or text,
  never as card backgrounds.

### R3 Spacing on a grid
- **[auto]** Spacing is on the 4px grid (8px when `spacingBase` is 8): no
  `p-[13px]`, no `-2.5`/`-1.5` steps.
- **[look]** Related things are closer than unrelated things. Inside a card:
  12-16px. Between cards: 16-24px. Between page sections: the density's
  `sectionGap` is the total space between two sections' content (e.g. 96px =
  `py-12` on each section, not `py-24`).
- Padding is the same on all cards of one kind.

### R4 Alignment
- **[look]** Everything sits on a few vertical lines. Left edges of headings,
  text and controls line up. Count the distinct left edges in the main column:
  aim for 3 or fewer.
- Use a real grid (`grid grid-cols-12` or fixed sidebar + fluid main), and a
  max content width (`max-w-6xl`/`max-w-7xl`) on wide screens.

### R5 Real content
- **[auto]** No lorem ipsum, no John/Jane Doe, no Acme, no "Your name here".
- **[look]** Content is specific to the product in the prompt: real-sounding
  names (varied cultures), plausible numbers with uneven values (`$48,210`,
  not `$50,000`), real dates, believable copy with a point of view. Lists
  have uneven lengths. Tables have 6-12 rows, not 3.
- Use `.example` for any web address or email domain.

### R6 No default gradients
- **[auto]** No `bg-gradient-to-*` with purple/violet/indigo/blue/pink/cyan
  stops. Any gradient at all is a warning: keep it only if it serves the
  product (a chart fill, a photo scrim).
- Use flat surfaces, a hairline border, or one solid accent block instead.

### R7 No emoji as icons
- **[auto]** No pictographic emoji anywhere in the UI. Text glyphs are fine where
  text belongs: arrows, a check mark in a terminal transcript, a shell prompt.
- Icons are inline SVG, 16-20px, `stroke="currentColor"`, 1.5px stroke, one
  consistent style (Lucide-style outlines). An icon only where it helps scanning
  (nav, actions, status), never one above every heading.

### R8 No glass by default
- **[auto]** No `backdrop-blur`. No translucent white cards on colourful
  backgrounds.
- Surfaces are solid: `bg-surface border border-line`, optional `shadow-sm`.

### R9 Not everything centred
- **[auto]** Warn when many blocks are `text-center`.
- **[look]** Marketing heroes are left-aligned or split (copy left, product
  right) unless there is a reason. App screens are never centred columns of
  cards.
- Avoid the three-identical-feature-cards row. Vary: one large + two small,
  a list with detail, a real product screenshot.

### R10 Quiet surfaces
- **[auto]** Warn on more than 3 `shadow-xl`/`shadow-2xl`.
- Borders do most of the separating. Large radius only on large things.
  Buttons and inputs share one radius (`rounded-md`).

### R11 Contrast and accessibility (WCAG AA)
- **[auto]** Design-system pairs pass AA: text 4.5:1, accent on surface 3:1.
  Images have `alt`.
- **[look]** No light-grey text on white below `text-muted`. Focus states are
  visible (`focus-visible:ring-2 ring-accent`). Hit targets are at least 40px
  tall on desktop, 44px on mobile; dense dashboard rows may use 32px in-row
  actions. Form fields have visible labels, not
  placeholder-only. Outlines of controls (inputs, checkboxes, toggles) use
  `border-muted`, not `border-line`: non-text UI needs 3:1.

### R12 Density fits the app type
`get_project` returns the density targets for the project's `appType`:

| appType | body text | row height | section gap | feel |
|---|---|---|---|---|
| dashboard | `text-sm` (14px) | 40px | 24px | dense, tables, many numbers, sidebar nav |
| mobile | `text-base` (16px) | 56px | 24px | one column, 390px wide, thumb reach, bottom nav |
| marketing | `text-lg` (18px) | 48px | 96px | generous space, big type, few words per block |
| content | `text-lg` (18px) | 48px | 48px | 60-75 characters per line |
| form | `text-base` (16px) | 44px | 32px | one column of fields, grouped, clear labels |

The page body defaults to `text-base`; set the body-text class on your
outermost element. Sizes assume the default scale.

- **[look]** A dashboard shows real work at once (a table, a chart, filters),
  not three giant KPI cards and empty space.

## Making 3-4 variants that are actually different

Variants must differ in **structure**, not just colour. Pick distinct
directions, for example:

1. **Dense / utilitarian**: table-first, compact rows, sidebar nav.
2. **Editorial**: a strong display headline, a big number, more air, serif
   `font-display` where the design system has one.
3. **Card / modular**: a bento-style grid with mixed sizes.
4. **Focused**: one task front and centre, everything else secondary.

Give each a 2-5 word title and a one-sentence rationale.

## Markup contract (Design Studio)

- Save **body markup only**. The studio adds Tailwind and the tokens.
- No external assets: no web fonts, no image URLs, no CDN scripts. Draw
  charts, avatars (initials) and illustrations with inline SVG or CSS.
- Mobile variants: wrap the screen in
  `<div class="mx-auto w-[390px] min-h-[844px] bg-bg">` and render with the
  `mobile` viewport.
- No JavaScript is needed for a static screen; avoid it.

## Review checklist (critic)

1. `check_variant` -> fix every error, most warnings.
2. `render_variant` -> look at it. Answer each [look] question above.
3. Fix the markup, `save_variant` with the same `variant_id` and
   `stage: "reviewed"` and `notes` listing what you changed.
