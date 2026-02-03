# Task 017: Set up background sending service

**Created:** 2026-02-03  
**Story:** 009  
**Assignee:** Mobile squad  
**Estimate:** 6h  
**Priority:** High  
**Status:** Done (2026-02-03 - Colin)

## Description
Configure Capacitor background task / Android foreground service to keep send loop alive when app minimized.

## Subtasks
- [x] Spike suitable background APIs
- [x] Implement service lifecycle
- [x] Request required permissions

## Blockers
Need Android/iOS policy confirmation

## Notes
- Added @capawesome-team/capacitor-android-foreground-service + @capawesome/capacitor-background-task deps with config wrapper
- Implemented background service manager bridging Capacitor App events, background tasks, and Android foreground notifications
- Added background service unit tests plus notification config defaults; build + vitest passing
- Follow-up: supply real Android small icon asset before shipping device build
