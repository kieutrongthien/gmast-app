# Task 012: Guard startup flow with version gate

**Created:** 2026-02-03  
**Story:** 006  
**Assignee:** Mobile squad  
**Estimate:** 3h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Wire version service into splash/router to block entry when build is unsupported.

## Subtasks
- [x] Add guard to router
- [x] Display blocking modal
- [x] Add retry hook

## Blockers
Depends on version service

## Notes
Ensure guard runs before auth
- Added `versionGateController` + `useVersionGate` to centralize snapshot state, router guard now blocks routing until snapshot resolves.
- Injected `VersionGateModal` into `App.vue` to show blocking UI with download + retry actions tied to the service. Modal is non-dismissible.
- `VersionGateController` covered by new Vitest suite; full `npm run test:unit` (39 tests) and `npm run build` both pass (unchanged chunk-size warning).
