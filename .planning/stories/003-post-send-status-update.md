# Story 003: Update message status after sending

**Created:** 2026-02-03  
**Epic:** 001  
**Points:** 5  
**Priority:** Medium  
**Status:** To Do

## User Story
As a **GMAST operator**,  
I want to **automatically report delivery results to the API**,  
So that **the central system stays in sync with device actions**.

## Acceptance Criteria
- [ ] POST /messages/{id}/result called per send
- [ ] Failures report error code + SIM
- [ ] UI surfaces sync failures

## Technical Notes
Wrap send result + metadata and retry failures up to 3x

## Dependencies
None

## Related Tasks
None yet

## Definition of Done
- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] Acceptance criteria verified
