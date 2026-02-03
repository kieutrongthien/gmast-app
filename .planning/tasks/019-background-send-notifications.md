# Task 019: Add background send notifications

**Created:** 2026-02-03  
**Story:** 009  
**Assignee:** Mobile squad  
**Estimate:** 3h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Deliver system notifications for progress, completion, and errors while send loop runs off-screen.

## Subtasks
- [x] Design notification copy
- [x] Show persistent progress
- [x] Provide tap-to-resume

## Blockers
Needs controller events

## Notes
Follow Android foreground service notification rules
- Introduced `backgroundSendNotificationService` for start/progress/complete/error copy, and wired controller deps to call it (with analytics + state updates).
- Added progress tracking via `dispatchQueueSequentially.onResult` so persistent notification shows live counts; `queueStore` unaffected.
- Registered `notificationActionRouter` in `main.ts` so tapping notification routes back into app home.
- Tests: updated `sendDispatcher.spec.ts`, `backgroundSendController.spec.ts`, added `queueStore.spec.ts`; `npm run test:unit` (42) + `npm run build` (chunk warning unchanged).
