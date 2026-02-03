# Task 012: Guard startup flow with version gate

**Created:** 2026-02-03  
**Story:** 006  
**Assignee:** Mobile squad  
**Estimate:** 3h  
**Priority:** Medium  
**Status:** To Do

## Description
Wire version service into splash/router to block entry when build is unsupported.

## Subtasks
- [ ] Add guard to router
- [ ] Display blocking modal
- [ ] Add retry hook

## Blockers
Depends on version service

## Notes
Ensure guard runs before auth
