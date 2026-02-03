# Task 008: Build SIM inventory UI

**Created:** 2026-02-03  
**Story:** 004  
**Assignee:** Mobile squad  
**Estimate:** 3h  
**Priority:** Low  
**Status:** Done (2026-02-03 - Colin)

## Description
Create settings sheet listing detected SIM/eSIM profiles with availability state.

## Subtasks
- [x] Design sheet layout
- [x] Bind plugin data
- [x] Add refresh action

## Blockers
Depends on plugin data

## Notes
- Grey out unavailable SIMs
- Inventory sheet modal shows carrier/name/slot metadata with availability badges and disabled styles for inactive slots.
- Sheet ties into `useSimSelection` + Capacitor SIM plugin data, including manual refresh + permission/status messaging.
- Tests: `npm run test:unit` (covers `SimInventorySheet` spec).
