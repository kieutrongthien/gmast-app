# Task 015: Implement queue dashboard layout

**Created:** 2026-02-03  
**Story:** 008  
**Assignee:** Mobile squad  
**Estimate:** 5h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Compose Ionic/Tailwind layout with KPI cards, tabs, and message list sections.

## Subtasks
- [x] Define Tailwind theme
- [x] Build KPI cards
- [x] Optimize responsive states

## Blockers
Need finalized metrics

## Notes
Ensure accessibility contrast
- Introduced GMast dashboard theme (Fira Sans/Fira Code, #020617/#22C55E palette) via `src/theme/variables.css` to give consistent KPI styling + accessible contrast.
- Rebuilt `HomePage` hero + KPI grid + queue tabs + SIM sidebar with responsive CSS, segment filters, and computed metrics (pending, held, SLA risk, retry averages).
- Verified with `npm run test:unit` (39 passing) and `npm run build` (unchanged chunk warning >500kB).
