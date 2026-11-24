# Skunky.net responsive homepage preview

This directory is an **isolated design preview**. It does **not** change the existing Skunky site or the active GitHub Pages CNAME, currently skunky.net.

## Design source

- Canonical design system: https://brand.skunkworks.africa/
- Semantic light/dark tokens: https://brand.skunkworks.africa/tokens.css
- Shared group palette: https://brand.skunkworks.africa/tokens.json
- Navigation, focus, motion and responsive patterns: https://brand.skunkworks.africa/navigation/
- Product mascot: a hand-authored scalable SVG interpretation of the supplied Skunky reference. The original user-provided raster can replace this asset after an approved asset-import workflow.

## Responsive behavior

- Wide desktop: three-column hero with mascot, capability bubbles and product positioning; form appears below.
- Tablet: heading first, two-column mascot + capabilities, collapsible nav.
- Mobile: single-column hero, horizontally scrollable capability chips, full-width search form, compact primary actions.
- Light/dark mode uses the canonical semantic token roles with local preference persistence; reduced-motion and high-contrast keyboard focus are supported.

## Important boundaries

- The public prompt is a **configuration preview**, not a live chatbot, scraper or collector.
- The documented authenticated Web Collector is a Next.js runtime, not hosted by GitHub Pages.
- The approved production runtime/domain remains undecided. Do not change the repo CNAME or advertise running scans until an independent runtime and policy review is complete.
- To open a static preview locally, serve this folder with any static file server and visit index.html.
