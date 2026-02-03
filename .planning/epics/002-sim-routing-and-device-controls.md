# Epic 002: SIM routing and device-side controls

**Created:** 2026-02-03  
**Priority:** High  
**Status:** Planning

## Description
Give operators granular control over which physical SIM or eSIM handles each batch while supporting random rotation for load balancing.

## Goals
- Expose available SIM/eSIM inventory
- Allow manual SIM selection per send
- Support random SIM assignment

## Success Criteria
- [ ] SIM picker renders available lines
- [ ] Random mode rotates evenly
- [ ] SIM choice honored during send

## Dependencies
Device SIM metadata access

## Risks
Platform limitations on SIM switching

## Related Stories
None yet

## Notes
