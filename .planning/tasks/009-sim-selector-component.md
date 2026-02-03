# Task 009: Implement SIM selector component

**Created:** 2026-02-03  
**Story:** 005  
**Assignee:** Mobile squad  
**Estimate:** 4h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Provide per-batch picker with manual SIM selection, validation, and persistence.

## Subtasks
- [x] Design picker UI
- [x] Persist choice
- [x] Hook into send config

## Blockers
Needs inventory UI data

## Notes
Store preference per device
- Added `SimSelector` card on HomePage with manual/random toggle, slot list, and permission/error states; uses new `useSimSelection` composable.
- Preferences now persist via `sendConfigService` + Capacitor Preferences; selection auto-reconciles when SIM list changes.
- Start-up guard will read the same send config for dispatcher once Task 010 wiring lands.
