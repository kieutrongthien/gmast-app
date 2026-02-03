# Task 002: Render queue list UI

**Created:** 2026-02-03  
**Story:** 001  
**Assignee:** Mobile squad  
**Estimate:** 5h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Create Ionic/Tailwind list component showing pending messages with status badges and timestamps.

## Subtasks
- [x] Design list layout
- [x] Bind data store
- [x] Add pull-to-refresh

## Blockers
Waiting for sample data

## Notes
- Added mock queue generator + composable with cache + mock fallback
- QueueList component implements virtual window rendering + badges/time formatting
- HomePage wired with status card, pull-to-refresh, scroll binding, manual refresh
- Added Vitest coverage for mock builder + mount smoke test; `npm run build`, `npm run test:unit`
