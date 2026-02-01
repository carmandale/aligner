# Multi-Repo Registry Feature Spec

## Summary

Implement a registry system that allows Aligner to aggregate diagrams from multiple repositories while keeping diagrams git-tracked within each repo.

## Current Behavior

All diagrams stored in global `~/.aligner/` directory, not associated with any repo.

## Desired Behavior

### Directory Structure

```
~/.aligner/
├── registry.json              # Tracks all registered repos
└── global/                    # Diagrams not tied to any repo
    └── scratch.json

~/dev/orchestrator/.aligner/   # Git-tracked with repo
├── device-flow.json
└── gmp-media-flow.json

~/dev/other-project/.aligner/  # Git-tracked with repo
└── api-design.json
```

### Registry Format (~/.aligner/registry.json)

```json
{
  "version": "1.0",
  "repos": [
    { "path": "/Users/dale/dev/orchestrator", "name": "Orchestrator" },
    { "path": "/Users/dale/dev/aligner", "name": "Aligner" }
  ]
}
```

## Implementation Tasks

### 1. Server Changes (server/index.js)

- [ ] On startup, read `~/.aligner/registry.json`
- [ ] Scan all registered repo paths for `.aligner/` directories
- [ ] Include `~/.aligner/global/` as a "Global" source
- [ ] Gracefully skip missing/inaccessible repos

**New API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/repos` | GET | List registered repos |
| `/repos/register` | POST | Add repo to registry (body: {path, name}) |
| `/repos/:encodedPath` | DELETE | Remove repo from registry |
| `/diagrams` | GET | Return all diagrams with repo context |
| `/diagram/:repo/:filename` | GET/PUT | Read/write diagram in specific repo |

**Modified Response Format for GET /diagrams:**

```json
[
  {
    "filename": "device-flow.json",
    "name": "Device Flow",
    "repo": "Orchestrator",
    "repoPath": "/Users/dale/dev/orchestrator",
    "modified": "2024-01-30T..."
  }
]
```

### 2. CLI Commands (bin/aligner)

Add new commands:

```bash
aligner init       # Create .aligner/ in CWD + register repo
aligner register   # Add CWD to registry (must have .aligner/)
aligner unregister # Remove CWD from registry
aligner repos      # List all registered repos
```

### 3. Frontend Changes (src/App.tsx)

- [ ] Group diagrams by repo in sidebar
- [ ] Show repo name as collapsible sections
- [ ] Add "Global" section for non-repo diagrams
- [ ] When creating new diagram, prompt for repo or global
- [ ] Update save logic to include repo context

**Sidebar UI Mockup:**

```
┌─────────────────────────────────┐
│ 📁 Orchestrator            [▼]  │
│   ├── device-flow               │
│   └── gmp-media-flow            │
│ 📁 Other Project           [▼]  │
│   └── api-design                │
│ 📁 Global                  [▼]  │
│   └── scratch                   │
└─────────────────────────────────┘
```

### 4. Migration

- [ ] On first run, if old `~/.aligner/*.json` files exist (not in global/), move them to `~/.aligner/global/`
- [ ] Create registry.json if missing

## API Contract Details

### POST /repos/register

```
Request:  { "path": "/abs/path/to/repo", "name": "Display Name" }
Response: { "success": true, "repos": [...] }
Error:    { "error": "Path does not exist" } (400)
Error:    { "error": "No .aligner/ directory found" } (400)
```

### GET /diagrams

```json
[
  {
    "filename": "flow.json",
    "name": "Flow Name",
    "repo": "Repo Display Name",
    "repoPath": "/abs/path",
    "modified": "ISO timestamp"
  }
]
```

### PUT /diagram/:repo/:filename

- `:repo` is URL-encoded path or "global"
- Creates `.aligner/` directory if needed
- Returns updated diagram with metadata

## Testing Checklist

- [ ] Register a repo, verify it appears in /repos
- [ ] Create diagram in registered repo, verify saved to repo's .aligner/
- [ ] Unregister repo, verify diagrams no longer appear
- [ ] Global diagrams work when no repo registered
- [ ] Missing repo paths handled gracefully
- [ ] Migration moves old diagrams to global/

## Files to Modify

1. `server/index.js` - API endpoints, registry logic
2. `bin/aligner` - CLI commands  
3. `src/App.tsx` - Grouped sidebar, repo context
4. `src/styles.css` - Collapsible repo sections
5. `README.md` - Document new multi-repo feature

## Success Criteria

1. Diagrams in repo `.aligner/` directories are git-trackable
2. UI shows all diagrams grouped by repo
3. Creating a diagram saves to the correct repo
4. CLI can register/unregister repos
5. Old diagrams migrate to global on upgrade
