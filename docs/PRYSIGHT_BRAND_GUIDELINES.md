# PrySight Brand Guidelines

**Version 1.0 - August 2026**

PrySight is a pricing intelligence platform that turns competitor prices, market movement, product matches and margin signals into clear pricing decisions.

## Brand promise

**See the market. Price with confidence.**

## Brand principles

- **Clarity:** turn complex pricing data into an understandable next step.
- **Confidence:** use evidence and specific outcomes instead of vague claims.
- **Control:** monitor pricing continuously and surface issues before margins erode.
- **Momentum:** move from monitoring to measurable commercial action.

## Logo system

Canonical assets:

- `public/brand/prysight-logo.svg` - primary horizontal lockup.
- `public/brand/prysight-logo-reversed.svg` - dark-surface lockup.
- `public/brand/prysight-mark.svg` - icon, avatar and favicon source.
- `src/app/icon.svg` - canonical browser/application icon used by Next.js.

Keep clear space around the logo. Do not stretch, rotate, recolor individual elements, add glow/shadows, or alter the spelling **PrySight**.

## Color system

| Role | Color | Hex |
|---|---|---|
| Primary identity | Midnight Navy | `#0F1833` |
| Deep text/surface | Deep Blue | `#26354F` |
| Primary action | Royal Blue | `#4169C9` |
| Secondary data | Soft Violet | `#7E77C8` |
| Signals/charts | Mist Cyan | `#69C5C2` |
| Positive states | Seafoam | `#62C7A6` |
| Secondary charts | Sky | `#89BEEA` |
| Caution | Warm Amber | `#B58B4A` |
| Errors only | Soft Coral | `#C8666D` |
| App background | Cloud | `#F6F8FC` |

The brand is intentionally calm. Navy and white dominate. Blue is used for action. Violet, cyan and mint support data and state. Coral is reserved for errors.

## Typography

Use **Inter**, with system UI fallbacks. Headings are semibold/bold with tight tracking. Body copy uses comfortable line height. All-caps is reserved for compact labels and eyebrows.

## Product UI

- 8px base spacing grid.
- 12-18px card radius.
- 8-12px control radius.
- 1px borders.
- Soft shadows only for hierarchy.
- Do not use decorative gradients inside analytical charts.
- Blue represents PrySight / own price in charts.
- Use mint for positive opportunities, amber for caution and coral only for exceptions/errors.

## Voice

PrySight sounds **clear, confident, actionable and human**. Explain what changed, why it matters and what the next step is. Avoid unsupported claims such as "guaranteed margin growth" or "revolutionary AI pricing".

## Core messages

- See the market. Price with confidence.
- Know where your price stands.
- Turn market movement into margin opportunity.
- From competitor data to a clear pricing decision.

## Governance

New product surfaces must use the shared CSS brand tokens in `src/app/globals.css` and the canonical `PrySightLogo` / `PrySightMark` components. Do not create one-off color variants.
