# Scratchpad - Multi-Repo Registry Implementation

## Current Task: Step 1 - Registry Manager Foundation

### Task Breakdown
- [x] Create `server/registry.js` module with ES module exports
- [x] Implement `getRegistryPath()` helper function
- [x] Implement `loadRegistry()` with graceful error handling
- [x] Implement `saveRegistry()` with atomic write-and-rename
- [x] Implement `registerRepo(path, name?)` (idempotent)
- [x] Implement `unregisterRepo(path)`
- [x] Implement `getAlignerDir(repoPath)`
- [x] Create unit tests
- [x] Verify acceptance criteria

### Key Requirements from Design
- Use ES module syntax (import/export)
- Use `os.homedir()` for `~/.aligner/` path
- Atomic writes: write to temp file, then rename
- Handle missing registry file → return empty registry `{ version: "1.0", repos: [] }`
- Handle corrupt JSON → log error, return empty registry
- `registerRepo()` must be idempotent (no duplicates)
- Registry file: `~/.aligner/registry.json`

### Acceptance Criteria Checklist
- [x] `server/registry.js` exists with ES module exports
- [x] `loadRegistry()` handles missing and corrupt files
- [x] `saveRegistry()` uses atomic write-and-rename
- [x] `registerRepo()` is idempotent
- [x] `unregisterRepo()` removes repos correctly
- [x] `getAlignerDir()` resolves paths correctly
- [x] Unit tests pass for all functions (19/19 passed)

### Test Results
```
✅ 19 tests passed
❌ 0 tests failed
```

### Files Created
- `server/registry.js` (135 lines) - Core registry manager module
- `server/registry.test.js` (196 lines) - Comprehensive integration tests

### Verification
- Registry file created at `~/.aligner/registry.json`
- All functions tested and working correctly
- Atomic writes verified
- Idempotency confirmed
- Error handling tested (missing files, corrupt JSON)

## Notes
- Current server uses ES modules (`import`/`export`)
- Uses `fs/promises`, `os.homedir()`, `path` modules
- Pattern: async/await for all file operations
