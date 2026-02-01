# Multi-Repo Registry - Step 1 Implementation

## Objective
Implement the Registry Manager foundation for Aligner's multi-repo feature.

## Code Tasks
Execute in order:

1. **tasks/step01/task-01-registry-manager-foundation.code-task.md**
   - Create `server/registry.js` module
   - Implement load/save with atomic writes
   - Handle missing/corrupt files gracefully
   - Add unit tests

## Acceptance Criteria
- [ ] `server/registry.js` exists with ES module exports
- [ ] `loadRegistry()` handles missing and corrupt files
- [ ] `saveRegistry()` uses atomic write-and-rename
- [ ] `registerRepo()` is idempotent
- [ ] `unregisterRepo()` removes repos correctly
- [ ] `getAlignerDir()` resolves paths correctly
- [ ] Unit tests pass for all functions

## Demo Verification
Run test suite showing registry can be loaded/saved. Manually verify `~/.aligner/registry.json` is created when missing.

## Reference
- Design: plan/design/detailed-design.md
- Implementation Plan: plan/implementation/plan.md (Step 1)
