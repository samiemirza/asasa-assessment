# Asasa design tokens (observed on myasasa.com, 2026-09-06)

Source: `https://myasasa.com/assets/app-*.css` and the app bundle. Recorded so the UI phase can match Asasa's system, which the brief recommends. Verify against the UI direction before use.

## Type
- `--display: "Geist", "Inter", -apple-system, sans-serif` — headings, numerals
- `--sans: "Inter", -apple-system, sans-serif` — body
- Both self-hosted as variable fonts (weights 100–900). Headings use tight tracking (`-0.03em`), sizes via `clamp()`.
- Scale: xs .75rem · sm .875rem · base 1rem · lg 1.125rem · 2xl 1.5rem · 5xl 3rem

## Color
| Token | Hex | Use |
|---|---|---|
| `--forest` | `#0D4A46` | brand dark, primary-foreground on green |
| `--forest-darker` | `#0A2E2B` | dark sections |
| `--forest-deepest` | `#062322` | deepest dark |
| `--green` / `--primary` | `#8CCB50` | primary action, ring |
| `--green-deep` | `#4B8C22` | green text on light |
| `--green-on-dark` | `#ACDF6F` | green text on dark |
| `--green-pale` | `rgba(140,203,80,.10)` | tinted surfaces |
| `--green-border` | `rgba(140,203,80,.28)` | tinted borders |
| `--grey` | `#F9FAFA` | page background / muted surface |
| `--stone` / `--secondary` | `#F5F3F2` | secondary surface |
| `--ink` / `--foreground` | `#0F1410` | text |
| `--body` | `#4A4A4A` | body text |
| `--muted` | `#9A9A9A` | muted text |
| `--muted-2` | `#C8C8C8` | disabled |
| `--hairline` / `--border` | `#E8E8E6` | borders |
| `--red` / `--destructive` | `#E05555` | errors |
| on-dark text | `rgba(255,255,255,.65)` mid · `.42` soft · `.10` hairline | |
| brief palette | `#0D4A46 #8CCB50 #F9FAFA #1A1F1B` | `#1A1F1B` appears in page markup as the dark ink variant |
| gold accents seen | `#E9CB78 #F5DE7D #C99A3A #EFE2C2` | sparingly, for gold imagery |

## Shape & depth
- Radii: `--r-xs 6px · --r-sm 8px · --r-md 10px · --r-lg 14px · --r-xl 18px · --r-2xl 24px · --r-pill 999px`
- Shadows (forest-tinted): sm `0 1px 2px rgba(13,74,70,.04)` · md `0 1px 2px rgba(13,74,70,.04), 0 8px 24px rgba(13,74,70,.06)` · lg `0 12px 32px rgba(13,74,70,.10)`
- Gutters: 16 / 18 / 24 / 40 / 56 px by breakpoint; container 1280px
- Motion: `.15s cubic-bezier(.4,0,.2,1)`; pulse dot for live status

## Patterns worth echoing
- Rate hero on dark forest with a pulse dot + "Live / Indicative / Fetching live rate" label, then `Rs. 39,138 per gram · 11.6638g to a tola`.
- Disclosure line: "This is the live market reference rate. Asasa's in-app buy and sell prices could be different and are always shown before you confirm."
- Amount input with quick chips (10k · 50k · 1L · 5L) and a "You get · 24K gold 0.000 g ≈ 0.00 tola" conversion.
