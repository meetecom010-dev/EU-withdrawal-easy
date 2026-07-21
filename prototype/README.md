# EU Withdrawly — frontend prototype

A fully interactive HTML/CSS/JS prototype of the complete EU Withdrawly experience —
no build step, no framework, no Shopify dependency. This is the design source of truth
before the UI is converted to Shopify Polaris web components.

## Run it

Open `index.html` in any browser (double-click works — no server needed).

All state (settings, decisions, onboarding progress) persists in `localStorage`.
Use **Reset demo** in the top bar to reseed the sample data.

## What's inside

| File | Purpose |
|---|---|
| `index.html` | Admin frame shell (top bar, sidebar, content outlet) |
| `styles.css` | Design system — Polaris-aligned tokens, EU-indigo brand accent |
| `data.js` | Sample data (14 requests, settings defaults, 30-day series) + persistence |
| `ui.js` | Shared components: toasts, modals, save bar, badges, charts |
| `views-core.js` | Onboarding wizard, dashboard, setup guide, analytics, plan |
| `views-requests.js` | Requests list (tabs/filters/bulk actions) + request detail |
| `views-settings.js` | Tabbed settings + live form preview + shared widget renderer |
| `views-preview.js` | Theme/order-status extension previews + interactive customer flow |
| `app.js` | Hash router, navigation, mobile menu |

## Fully interactive paths worth trying

1. **Onboarding** — first load walks the 4-step wizard (policy → surfaces → DPA).
2. **Customer flow demo** (sidebar → Storefront previews) — quantity selection,
   an exempt (personalized) item that can't be selected, a refund estimate, and
   submitting creates a *real* pending request in the Requests tab.
3. **Requests** — full lifecycle: pending → awaiting return → return received →
   refunded (with optional diminished-value deduction) or rejected (with Art. 16
   exemption templates). Bulk actions, filters, notes, tags, deadline clocks.
4. **Settings** — 7 tabs: General, Eligibility (exempt categories + product
   tags), Returns & refunds (shipping payer, withhold-until-return, restock),
   Form & content (live preview), Automation (holds, auto-approve, abuse
   signals), Emails, Compliance (checklist + policy generator).
5. **Settings → Emails** — 5 editable templates with `{{variable}}` chips,
   live branded preview, reset-to-default, test send, and branding controls
   (from name, reply-to, accent color).
6. **Analytics** — funnel, outcomes, reasons, countries, most-withdrawn
   products, table view, real CSV export.

## Design decisions

- **Polaris-faithful chrome** (new admin design language): `#f1f1f1` ground,
  bordered white cards with `0 1px 0` shadow, "lifted" secondary buttons,
  near-black gradient primaries, borderless Polaris badge fills, pill tabs,
  `#005bd3` focus rings — so the conversion to `s-*` web components is 1:1.
- **EU-indigo accent** (`#2b45a8`) only on customer-facing surfaces and
  compliance badges; the admin stays neutral like real Shopify apps.
- **Compliance as a feature**: the 2026 withdrawal-button requirement
  (Directive 2023/2673), 14-day refund clocks (Art. 13), withhold-until-return
  (Art. 13(3)), diminished-value deductions (Art. 14(2)), acknowledgements
  (Art. 11a) and exemptions (Art. 16) are all modeled in the UI. Chart palette
  is CVD-validated.
