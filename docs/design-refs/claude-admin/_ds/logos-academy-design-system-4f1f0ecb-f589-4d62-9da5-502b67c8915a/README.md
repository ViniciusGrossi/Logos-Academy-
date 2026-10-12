# Logos Academy — conventions for the design agent

Logos Academy is a technology and AI school (`Explorer → Builder → Engineer`).
Promise: *não apenas aprenda tecnologia. Construa com ela.* Language: **pt-BR**.

**This is a tokens + guidelines system — no compiled components.** Build UI from
the CSS custom properties in `tokens/tokens.css`. Never invent colors or fonts.

## Feel

Modern, technical, premium, human, construction-oriented. **Not** childish,
generic, over-corporate, cyberpunk, gamer or over-futuristic. Build, don't
decorate: every element communicates construction, progress, technology or
learning. Evidence over claims — show real projects, not promises.

## Tokens (all in `tokens/tokens.css`)

- **Surface (default = light):** `--background` `#FFFFFF`, `--foreground`
  `#101114`, `--surface` `#F5F6F7`, `--surface-elevated` `#FFFFFF`, `--muted`
  `#505761`, `--border` `#E9EAEC`. A `.dark` theme exists for hero / cinematic
  panels — use it deliberately, not by default.
- **Accent:** `--accent` = `--color-orange-500` `#FF6B00` (primary actions, CTAs,
  active, progress). Hover `--color-orange-400` `#FF8126`, pressed
  `--color-orange-600` `#E85F00`. Orange is signal, not universal fill.
- **Journey levels:** `--color-explorer` `#7C5CFC`, `--color-builder` `#FF6B00`,
  `--color-engineer` `#2563EB` (+ `-soft` tints).
- **Status:** `--color-success` `#16A34A`, `--color-warning` `#D97706`,
  `--color-error` `#DC2626`, `--color-info` `#0891B2`.
- **Type:** `--font-sans` (Inter) for UI; Inter 700–800 for hero/titles/numbers;
  `--font-mono` (JetBrains Mono) for code/prompts/APIs/data. Scale `--text-xs`
  12px → `--text-7xl` 72px. Body min 14px. Don't mix other fonts.
- **Space:** 4px base, `--space-1` (4) → `--space-32` (128).
- **Radius:** `--radius-md` 10px (buttons), `--radius-lg` 14px (cards),
  `--radius-pill` 999px.
- **Shadow:** `--shadow-soft`, `--shadow-elevated`. Avoid heavy shadows.
- **Motion:** `--motion-fast` 150ms → `--motion-emphasis` 700ms; `--ease-standard`,
  `--ease-emphasis`. Motion reveals/connects/orients — never decorates. Respect
  `prefers-reduced-motion`.

## Components (compose from tokens)

- **Button** — Primary: bg `--accent`, text `#FFFFFF`, radius `--radius-md`.
  Secondary: transparent, `1px solid #D5D8DC`, text `--foreground`. Dark: bg
  `--foreground`, text `#FFFFFF`. Labels use specific verbs ("Começar projeto",
  "Continuar aula", "Publicar projeto") — not "Clique aqui" / "Saiba mais".
- **Card** — radius `--radius-lg`, `1px solid var(--border)`, padding `--space-6`,
  bg `--surface-elevated`. Organizes information, doesn't decorate.
- **Input** — label always visible; focus = orange border; errors explain the fix.
- **Progress / Badge** — for level, module, lesson, project, competency. Never
  decorative. Badge level colors = the journey tokens above.

## Platform

Feels like Learning Platform + Creative Workspace + Portfolio + Developer
Environment — not an LMS. Dashboard priority: next action → current project →
progress → feedback → lessons → achievements → portfolio. Ask "what does the
student need to do right now?" Project status: `Idea → Building → Review →
Approved → Published`.

## Build order & tie-breaker

`Brand → Audience → Level → User goal → Information architecture → Layout →
Components → Visual details → Motion`. On any conflict choose **utility,
comprehension, performance, function, evidence**.

---

## Where things are

| Path | What |
| --- | --- |
| `styles.css` | Entry point. `@import`s `tokens/tokens.css` + `fonts/fonts.css`. Rendered designs receive exactly this closure. |
| `tokens/tokens.css` | All design tokens — `:root` (light) + `.dark` theme. |
| `fonts/fonts.css` + `*.woff2` | Inter + JetBrains Mono, variable weight, "latin" subset (ASCII + pt-BR accents). |
| `guidelines/index.md` | Guide catalog — start here. |
| `guidelines/brand.md` | Full brand rules (color table, type, layout, motion, do/don't, AI builder order). |
| `guidelines/components.md` | Component specs + platform / project-system / prompt-library rules. |
| `guidelines/voice.md` | Tone for young vs. professional audiences, button label verbs, hero storytelling, logo. |
| `guidelines/dark-executive-surface.md` | 4 dark cinematic reference screens — a **complementary** surface, not the default. |
| `_ds_bundle.js` | Tokens-only stub — no components; exposes `window.LogosAcademyDesignSystem`. |
| `_ds_bundle.css` | Runtime-styles stub — no extracted component CSS. |

## Loading

Every rendered design gets `styles.css` and its `@import` closure. There is no
component runtime to mount — compose components from the tokens and the
`guidelines/`.

## Tokens

Source of truth is `tokens/tokens.css`. Design tokens (colors, spacing,
typography, radius, motion) are never hardcoded — always `var(--token)`.
