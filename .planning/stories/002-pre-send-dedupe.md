# Story 002: Skip messages handled by other devices

**Created:** 2026-02-03  
**Epic:** 001  
**Points:** 8  
**Priority:** High  
**Status:** To Do

## User Story
As a **GMAST operator**,  
I want to **avoid re-sending items another device already processed**,  
So that **recipients never receive duplicate SMS**.

## Acceptance Criteria
- [ ] Pre-send check calls /messages/{id}/status
- [ ] If status=processing|sent message is skipped
- [ ] Send queue logs skip reason

## Technical Notes
Invoke HEAD/GET status before invoking device send

## Dependencies
None

## Related Tasks
None yet

## Definition of Done
- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] Acceptance criteria verified
