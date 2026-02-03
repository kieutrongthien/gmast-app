# Story 001: Pull queued messages from API

**Created:** 2026-02-03  
**Epic:** 001  
**Points:** 5  
**Priority:** High  
**Status:** To Do

## User Story
As a **GMAST operator**,  
I want to **load the latest pending messages into the device queue**,  
So that **I can review and send them without logging into another console**.

## Acceptance Criteria
- [ ] API call returns sorted pending list
- [ ] Failed fetch retries with backoff
- [ ] Queue UI shows timestamp + status

## Technical Notes
Call /messages/pending with auth token and page handling

## Dependencies
None

## Related Tasks
None yet

## Definition of Done
- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] Acceptance criteria verified
