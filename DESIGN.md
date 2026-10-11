---
name: ACK
preset: nova
base: radix
description: A restrained ledger interface for onchain agent reputation.
colors:
  paper: '#f4f3ef'
  ink: '#14151a'
  action: '#0052ff'
  action-active: '#0043d6'
  link-dark: '#6b93ff'
rounded:
  badge: 4px
  control: 6px
  card: 8px
  overlay: 12px
spacing: 4
---

# ACK

ACK is a public reputation record for ERC-8004 agents. The interface should read like a well-set ledger: tight, confident, and legible. One blue action. Hairline structure. No decorative chrome.

Geometry follows the shadcn **nova** preset (compact controls, 6–8px radius, hairlines instead of shadows). The installed primitives stay on **Radix**, which this app already uses. New Base apps should start on shadcn/Base UI; this repo does not swap the primitive library.

## Colors

The palette is warm paper and ink, with Base blue reserved for the action.

| Token          | Light     | Dark      | Use                                                                          |
| -------------- | --------- | --------- | ---------------------------------------------------------------------------- |
| paper / canvas | `#f4f3ef` | `#0e0f12` | Page floor                                                                   |
| sheet          | `#fbfbf9` | `#16181d` | Cards, popovers                                                              |
| ink            | `#14151a` | `#f3f2ec` | Headlines and body                                                           |
| muted ink      | `#4e524c` | `#a7aaa2` | Secondary text. Both clear 4.5:1 on canvas, sheet, and muted bands           |
| band           | `#ebeae4` | `#1c1e24` | Hover, selected quiet fill, skeletons                                        |
| hairline       | `#d9d7d0` | `#2c2f36` | 1px borders and dividers                                                     |
| field line     | `#c9c6bd` | `#3a3d44` | Input borders                                                                |
| action         | `#0052ff` | `#0052ff` | Primary button fill. White label is 5.75:1                                   |
| action pressed | `#0043d6` | `#0043d6` | Primary hover and press                                                      |
| link           | `#0052ff` | `#6b93ff` | Text links. Dark link is 6.61:1 on the canvas                                |
| danger         | `#9f1c14` | `#ff8d86` | Errors and destructive text                                                  |
| danger fill    | `#b42318` | `#c2413a` | Destructive buttons. White label clears 4.5:1                                |
| confirmed      | `#146c43` | `#8fd0a8` | Paid, active, and positive counts. Text and tints, not a second button color |
| code floor     | `#14151a` | `#0a0b0e` | Code blocks stay dark in both themes                                         |
| code ink       | `#e7e4da` | `#e7e4da` | Code text                                                                    |

Chart series, in order: action blue, confirmed green, `#8a5a12`, `#5c4d8a`, `#8a3d3d`.

## Semantic tokens

Map the palette onto shadcn variables. Do not introduce a parallel set of raw hex utilities in components.

| Role           | Variable                                                             |
| -------------- | -------------------------------------------------------------------- |
| Canvas         | `--background` / `--foreground`                                      |
| Sheet          | `--card` / `--card-foreground`, `--popover` / `--popover-foreground` |
| Action         | `--primary` / `--primary-foreground`, pressed `--primary-active`     |
| Text link      | `--link`                                                             |
| Quiet fill     | `--secondary`, `--muted`, `--accent` and their foregrounds           |
| Secondary text | `--muted-foreground`                                                 |
| Hairline       | `--border`                                                           |
| Field line     | `--input`                                                            |
| Focus          | `--ring`                                                             |
| Danger text    | `--destructive`                                                      |
| Danger button  | `--destructive-fill` with white text                                 |
| Confirmed      | `--success`                                                          |
| Code           | `--code` / `--code-foreground`                                       |
| Charts         | `--chart-1` … `--chart-5`                                            |
| Sidebar        | `--sidebar-*`, same sheets and ink as the page                       |

## Typography

UI text is Geist. Scores, addresses, hashes, and code are Geist Mono. `--font-heading` stays on Geist; display type is the same face at a larger size, not a second family.

| Utility        | Size / line / weight / tracking                       | Use                               |
| -------------- | ----------------------------------------------------- | --------------------------------- |
| `type-display` | clamp(40px, 5vw, 56px) / 1.02 / 600 / -0.035em        | The ACK wordmark and nothing else |
| `type-title`   | clamp(28px, 2vw + 16px, 36px) / 1.15 / 600 / -0.025em | Page titles                       |
| `type-heading` | 16px / 1.35 / 600 / -0.011em                          | Section titles                    |
| `type-body`    | 15px / 1.55 / 450                                     | Paragraphs                        |
| `type-small`   | 13px / 1.45 / 450                                     | Rows, helper text                 |
| `type-kicker`  | 12px / 1.3 / 600 / 0.08em, uppercase                  | One short label above a title     |
| `type-mono`    | 13px / 1.4 / 500, tabular nums                        | Scores and addresses              |

Display and title weights stay at 600. Do not set them to 700 or to a compressed all-caps tracking.

## Spacing

The base unit is 4px. Use the Tailwind scale; do not invent one-off values.

| Step | Value | Use                            |
| ---- | ----- | ------------------------------ |
| 1    | 4px   | Icon gaps, badge padding       |
| 2    | 8px   | Related items inside a control |
| 3    | 12px  | Row padding, compact stacks    |
| 4    | 16px  | Card padding, page gutter      |
| 6    | 24px  | Between groups                 |
| 8    | 32px  | Between sections inside a page |
| 12   | 48px  | Hero padding                   |
| 16   | 64px  | Large page breaks              |

## Radius

Pinned in the theme. Do not derive these from a single `--radius` multiplier, and do not use values outside the scale.

| Token          | Value | Use                                      |
| -------------- | ----- | ---------------------------------------- |
| `--radius-sm`  | 4px   | Badges, ticks                            |
| `--radius-md`  | 6px   | Menu items, avatars                      |
| `--radius-lg`  | 6px   | Buttons, inputs, selects                 |
| `--radius-xl`  | 8px   | Cards, panels                            |
| `--radius-2xl` | 12px  | Menus, dialogs, code blocks              |
| `--radius-3xl` | 12px  | Same as 2xl. No larger decorative radius |
| `--radius-4xl` | 8px   | Not a pill. Badges stay on `--radius-sm` |

## Elevation

Hairlines do the work. Shadows appear only when a surface floats above the page.

| Level | Treatment                                | Use                                  |
| ----- | ---------------------------------------- | ------------------------------------ |
| 0     | No shadow, no border                     | Canvas                               |
| 1     | 1px `--border`, `--shadow-xs: 0 0 #0000` | Cards, rows, inputs, outline buttons |
| 2     | 1px border plus `--shadow-md`            | Menus, popovers, select panels       |
| 3     | 1px border plus `--shadow-lg`            | Dialogs and toasts                   |

`--shadow-md` is `0 1px 2px rgb(20 21 26 / 0.06), 0 8px 24px rgb(20 21 26 / 0.08)`. In dark mode the same tokens use black at higher alpha. There is no glow, no blur, and no colored shadow.

## Components

Control heights move together.

| Control                | Height      | Padding         |
| ---------------------- | ----------- | --------------- |
| Button, input, default | 36px        | 14px horizontal |
| Small                  | 32px        | 12px horizontal |
| Large                  | 40px        | 16px horizontal |
| Icon button            | 36px square | —               |

| Recipe           | Implementation                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| Primary action   | `Button` default. Blue fill, white label, darkens to `--primary-active` on hover and press. One per group |
| Secondary action | `Button` outline. Sheet fill, hairline, ink label, muted hover                                            |
| Quiet action     | `Button` ghost. No border until hover                                                                     |
| Text link        | `Button` link, or `text-link`                                                                             |
| Danger           | `Button` destructive                                                                                      |
| Badge            | Hairline or muted fill, 4px radius, 11px medium. Not uppercase, not mono, not a pill                      |
| Card             | `--card`, 1px border, 8px radius, no shadow                                                               |
| Text input       | 36px, hairline `--input`, 6px radius, ring on focus                                                       |
| Row              | Full width, hairline divider, muted hover. Do not invert to a solid fill                                  |
| Code block       | `--code` floor, mono, 12px radius, 16px padding                                                           |
| Kicker           | `type-kicker` in muted ink, once, above a title                                                           |

Focus: buttons and links use a 2px `--ring` outline with 2px offset. Fields keep a 3px ring at 30% plus a `--ring` border. Do not remove the outline.

## Do's and Don'ts

Do:

- Put the action in blue and leave everything else ink, paper, or hairline.
- Set UI copy in sentence case. Reserve uppercase for `type-kicker`.
- Use mono for a score, an address, a hash, or a code sample.
- Keep both themes on the same roles. Dark mode is a recolor, not an inversion.
- Let a missing avatar be a flat color tile with no letter and no numeral.

Don't:

- Don't use gradients, glass, backdrop blur, or glow.
- Don't invert a row or a card to a solid fill on hover.
- Don't draw a 2px black frame around every region.
- Don't set body, buttons, or navigation in all caps or in mono.
- Don't introduce a second action color. The old mint (`#00FF94`, `#00DE73`) is not a button color.
- Don't write `bg-black`, `text-black`, `bg-white`, or raw hex in product UI. Use the semantic tokens.
- Don't put a shadow on a card that already has a hairline.

## Dark mode

Both themes are specified above. The app toggles `.dark` on the root with `next-themes`. A section can take `className="dark"` when it should render with the dark tokens inside a light page. Code blocks use `--code`, so they stay dark in both themes without a second mechanism.

## Known gaps

- Radix stays. Switching every primitive to Base UI would rewrite `asChild` call sites and the wallet, kudos, and registration flows.
- The showroom scene keeps its own material colors. It is not a product surface.
- Category hues in `config/contract.ts` and chain colors in `config/chains.ts` stay data. Badges use them as ink on a hairline chip.
- RainbowKit follows the same blue and the active theme. Its modal is not rebuilt.
