# Task 011: Build version check service

**Created:** 2026-02-03  
**Story:** 006  
**Assignee:** Mobile squad  
**Estimate:** 4h  
**Priority:** Medium  
**Status:** Done (2026-02-03 - Colin)

## Description
Call /app-version on launch, compare required build, and expose result to UI.

## Subtasks
- [x] Define version schema
- [x] Implement API call
- [x] Cache result locally

## Blockers
Need endpoint details

## Notes
Consider offline grace period
- Added reusable version types + service with caching + unit coverage (fresh cache, permission errors, offline fallback)
