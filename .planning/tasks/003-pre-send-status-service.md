# Task 003: Build pre-send status check service

**Created:** 2026-02-03  
**Story:** 002  
**Assignee:** Mobile squad  
**Estimate:** 4h  
**Priority:** High  
**Status:** Done (2026-02-03 - Colin)

## Description
Create helper to call /messages/{id}/status and interpret processing/sent flags before dispatch.

## Subtasks
- [x] Define status enum
- [x] Implement API call
- [x] Unit test responses

## Blockers
Status API spec confirmation

## Notes
- Added `messageStatus` types + enums covering remote flags/state mapping
- Implemented `checkPreSendStatus` with retry, 404-not-found sendable fallback, network guard
- Added Vitest suite mocking http client to cover sendable/sent/404/error paths
- `npm run test:unit`, `npm run build`
