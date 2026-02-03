# Story 006: Run startup version compliance check

**Created:** 2026-02-03  
**Epic:** 003  
**Points:** 5  
**Priority:** Medium  
**Status:** To Do

## User Story
As a **GMAST admin**,  
I want to **ensure devices are on a supported build before syncing**,  
So that **we avoid protocol mismatches**.

## Acceptance Criteria
- [ ] App calls /app-version before dashboard
- [ ] Unsupported builds show blocking dialog
- [ ] API message includes changelog + link

## Technical Notes
Implement blocking modal with deep link to store

## Dependencies
None

## Related Tasks
None yet

## Definition of Done
- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] Acceptance criteria verified
