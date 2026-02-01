---
status: pending
created: 2026-02-01
started: null
completed: null
target_repo: null
---
# Task: Registry Manager Foundation

## Target Repository
Current repository

**IMPORTANT:** Before starting implementation, ensure you are in the aligner repository root.

## Description
Create the core registry manager module (`server/registry.js`) that handles loading, saving, and manipulating the registry file at `~/.aligner/registry.json`. This module provides the foundation for the multi-repo feature by managing the central list of registered repositories.

## Background
Aligner currently stores all diagrams in a single `~/.aligner/` directory. To support multiple repositories, we need a registry that tracks which repos have been initialized with Aligner. The registry manager is the foundation that all other multi-repo features will build upon.

The registry uses a simple JSON file format with atomic write operations to prevent corruption. It must gracefully handle missing or corrupt files to ensure robust operation.

## Reference Documentation
**Required:**
- Design: .ralph-o/sessions/001-planning-session/plan/design/detailed-design.md

**Note:** You MUST read the detailed design document before beginning implementation. Pay special attention to the Registry Manager interfaces and error handling sections.

## Technical Requirements
1. Create `server/registry.js` using ES module syntax (export/import)
2. Implement `loadRegistry()` - reads and parses `~/.aligner/registry.json`
3. Implement `saveRegistry(registry)` - writes registry with atomic write-and-rename pattern
4. Implement `registerRepo(path, name?)` - adds repo to registry (idempotent)
5. Implement `unregisterRepo(path)` - removes repo from registry
6. Implement `getAlignerDir(repoPath)` - returns repo's `.aligner/` path or global path
7. Use `os.homedir()` to resolve `~/.aligner/` path
8. Create `~/.aligner/` directory if it doesn't exist

## Dependencies
- Node.js `fs/promises` for file operations
- Node.js `os` module for home directory
- Node.js `path` module for path manipulation

## Implementation Approach
1. Create the module file with ES module exports
2. Implement helper function to get registry path (`~/.aligner/registry.json`)
3. Implement `loadRegistry()`:
   - Check if file exists; if not, return empty registry `{ version: "1.0", repos: [] }`
   - Read and parse JSON
   - Handle parse errors by logging and returning empty registry
4. Implement `saveRegistry()`:
   - Ensure `~/.aligner/` directory exists
   - Write to temp file, then rename (atomic operation)
   - Handle write failures with retry
5. Implement `registerRepo()`:
   - Load current registry
   - Check if path already registered (idempotent - return existing)
   - Add new repo with path, name (default to directory name), and timestamp
   - Save registry
6. Implement `unregisterRepo()`:
   - Load registry, filter out matching path, save
7. Implement `getAlignerDir()`:
   - If repoPath is "global" or null, return `~/.aligner/global/`
   - Otherwise return `{repoPath}/.aligner/`
8. Add unit tests for all functions

## Acceptance Criteria

1. **Load Registry - File Exists**
   - Given a valid `~/.aligner/registry.json` file exists
   - When `loadRegistry()` is called
   - Then the registry object is returned with correct repos array

2. **Load Registry - File Missing**
   - Given `~/.aligner/registry.json` does not exist
   - When `loadRegistry()` is called
   - Then an empty registry `{ version: "1.0", repos: [] }` is returned

3. **Load Registry - Corrupt JSON**
   - Given `~/.aligner/registry.json` contains invalid JSON
   - When `loadRegistry()` is called
   - Then an error is logged and empty registry is returned (graceful degradation)

4. **Save Registry - Atomic Write**
   - Given a registry object to save
   - When `saveRegistry()` is called
   - Then the file is written atomically (write temp, rename)
   - And the registry.json contains valid JSON with correct content

5. **Save Registry - Creates Directory**
   - Given `~/.aligner/` directory does not exist
   - When `saveRegistry()` is called
   - Then the directory is created and file is saved successfully

6. **Register Repo - New Repo**
   - Given a path to an unregistered repo
   - When `registerRepo(path)` is called
   - Then the repo is added to registry with path, default name (dir name), and timestamp
   - And the updated registry is saved

7. **Register Repo - Idempotent**
   - Given a path that is already registered
   - When `registerRepo(path)` is called again
   - Then the existing repo entry is returned unchanged
   - And no duplicate is created

8. **Register Repo - Custom Name**
   - Given a path and custom name
   - When `registerRepo(path, "Custom Name")` is called
   - Then the repo is registered with the custom display name

9. **Unregister Repo**
   - Given a registered repo path
   - When `unregisterRepo(path)` is called
   - Then the repo is removed from registry
   - And the updated registry is saved

10. **Get Aligner Dir - Repo Path**
    - Given a valid repo path like `/Users/dale/dev/myrepo`
    - When `getAlignerDir(repoPath)` is called
    - Then `/Users/dale/dev/myrepo/.aligner/` is returned

11. **Get Aligner Dir - Global**
    - Given "global" as the repoPath
    - When `getAlignerDir("global")` is called
    - Then `~/.aligner/global/` (expanded) is returned

12. **Unit Test Coverage**
    - Given the registry manager implementation
    - When running the test suite
    - Then all functions have corresponding unit tests covering success and error cases

## Metadata
- **Complexity**: Medium
- **Labels**: Backend, Foundation, Registry, File I/O
- **Required Skills**: Node.js, ES Modules, File System Operations, Atomic Writes, Unit Testing
