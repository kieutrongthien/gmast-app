# Task 016: Connect dashboard to live data

**Created:** 2026-02-03  
**Story:** 008  
**Assignee:** Mobile squad  
**Estimate:** 4h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Hook dashboard components to queue store, status counts, and refresh cadence.

## Subtasks
- [x] Build queue store
- [x] Wire KPI data
- [x] Add auto-refresh

## Blockers
Depends on queue API

## Notes
Throttle refresh to protect battery
- Added `queueStore` with cache hydration, throttle guard, and shared snapshot state; exposes `startAutoRefresh()` for dashboard subscribers.
- `usePendingQueue` now proxies the store, Home screen subscribes to auto-refresh + forces first load and manual refresh bypass.
- Created `queueStore.spec.ts` validating cache hydration + throttle, reran `npm run test:unit` (41 tests) and `npm run build` (same chunk warning).
