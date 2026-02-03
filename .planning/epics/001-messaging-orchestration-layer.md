# Epic 001: Reliable messaging orchestration

**Created:** 2026-02-03  
**Priority:** High  
**Status:** Planning

## Description
Implement the end-to-end pipeline that pulls queued messages, validates device ownership, and dispatches sequential sends via Ionic runtime.

## Goals
- Fetch queued messages from API server
- Skip items processed by other devices
- Update delivery status after send

## Success Criteria
- [ ] Can fetch queue in batches
- [ ] Skip logic prevents duplicate sends
- [ ] Status API reflects success/failure

## Dependencies
API contracts stable

## Risks
Throughput limits or API throttling

## Related Stories
None yet

## Notes
