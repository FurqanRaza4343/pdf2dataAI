# Vercel Web Interface Guidelines — Design Reference

## Core design principles

- **Clean, minimal** — generous whitespace, clear hierarchy, purposeful use of color
- **Premium feel** — layered shadows, crisp borders, nested radii (child ≤ parent)
- **Dark/light mode** — set `color-scheme` and `theme-color` appropriately
- **Optical alignment** — adjust ±1px when perception beats geometry

## Typography

- **Title Case** for headings & buttons (Chicago style)
- **Sentence case** on marketing pages
- **Active voice** — "Install the CLI" not "The CLI will be installed"
- **Clear & concise** — as few words as possible
- **Second person** — avoid first person
- **& over "and"**
- **Curly quotes** over straight quotes
- **Non-breaking spaces** for glued terms: `10&nbsp;MB`, `Cmd&nbsp;+&nbsp;K`
- **Ellipsis character** `…` over three periods `...`

## Layout

- Responsive on mobile, laptop, ultra-wide
- Respect safe areas for notches
- Deliberate alignment — every element aligns with something
- Balance contrast in lockups (text + icons)

## Colors & effects

- **Layered shadows** — at least 2 layers (ambient + direct light)
- **Crisp borders** — semi-transparent borders + shadow
- **Hue consistency** — tint shadows/borders toward same hue on non-neutral backgrounds
- **Interactions increase contrast** — hover/active/focus > rest state

## Components

- **Focus rings** on every interactive element (`:focus-visible`)
- **Loading buttons** — spinner + original label
- **Tooltip timing** — delay first, no delay on subsequent
- **No dead zones** — hit targets ≥ 24px (44px on mobile)
- **Links are links** — use `<a>`, never `<button>` for nav

## Content

- **Inline help first** — tooltips as last resort
- **No dead ends** — every screen has next step or recovery path
- **All states designed** — empty, sparse, dense, error
- **Redundant status cues** — don't rely on color alone
- **Stable skeletons** — mirror final content exactly
- **Tabular numbers** for comparisons (`font-variant-numeric: tabular-nums`)

## Brand voice

- **Action-oriented language**
- **Consistent placeholders** — strings: `YOUR_API_TOKEN_HERE`, numbers: `0123456789`
- **Use numerals** for counts — "8 deployments" not "eight deployments"
- **Space between numbers & units** — `10&nbsp;MB`
- **Positive language** — even for errors
- **Error messages guide the exit** — tell user how to fix it

---

Reference: https://vercel.com/design/guidelines
