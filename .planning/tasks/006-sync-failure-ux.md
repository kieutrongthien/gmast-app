# Task 006: Surface sync failures in UI

**Created:** 2026-02-03  
**Story:** 003  
**Assignee:** Mobile squad  
**Estimate:** 4h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Display non-blocking banner/toast when status updates fail and allow manual retry.

## Subtasks
- [x] Design error state
- [x] Wire to retry action
- [x] Add analytics

## Blockers
Depends on reporting service

## Notes
- Added `resultStorage` (Capacitor Preferences) + `resultSyncManager` to persist & retry failed posts
- `useResultSync` composable hydrates state, drives IonToast banner + chip on HomePage
- Manual retry button + toast action emits analytics (`result_sync_failure`, `result_sync_retry`)
- Provided `syncDeliveryResult` helper + tests (`resultSyncManager.spec.ts`), verified via `npm run test:unit`, `npm run build`
