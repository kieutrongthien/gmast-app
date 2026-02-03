# Task 007: Integrate multi-SIM Capacitor plugin

**Created:** 2026-02-03  
**Story:** 004  
**Assignee:** Mobile squad  
**Estimate:** 5h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Install and configure plugin to read SIM/eSIM metadata (label, carrier, state).

## Subtasks
- [x] Evaluate plugin options
- [x] Implement native hooks
- [x] Expose TypeScript bridge

## Blockers
Need device access for testing

## Notes
- Added @capgo/capacitor-sim v8 with Vitest coverage for snapshot normalization/permission edge cases.
- New simMetadataService normalizes slot metadata + permission guard + plugin availability checks, exported via services/sim.
- Documented iOS restriction via snapshot reason; build + unit tests passing.
