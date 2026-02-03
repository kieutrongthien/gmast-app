# Story 009: Run send pipeline in background

**Created:** 2026-02-03  
**Epic:** 001  
**Points:** 8  
**Priority:** High  
**Status:** To Do

## User Story
As a **GMAST operator**,  
I want to **start the sending process and let it continue in background**,  
So that **I can lock my phone and still deliver SMS batches**.

## Acceptance Criteria
- [ ] Start button triggers background service
- [ ] Service keeps sending when app minimized
- [ ] User notified on completion/errors

## Technical Notes
Leverage Capacitor Background Task / Foreground Service

## Dependencies
None

## Related Tasks
None yet

## Definition of Done
- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] Acceptance criteria verified
