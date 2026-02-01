# Multi-Repo Registry Feature - Detailed Design

## Overview

This document describes the design for implementing a multi-repo registry system in Aligner, allowing aggregation of diagrams from multiple git repositories while keeping each repo's diagrams tracked in local `.aligner/` directories.

### Goals

1. **Git-trackable diagrams** - Diagrams stored in repo's `.aligner/` directory can be committed and shared
2. **Aggregated view** - UI shows all diagrams from all registered repos in one place
3. **Repo organization** - Diagrams grouped by repo in sidebar with collapsible sections
4. **Simple CLI** - Single `aligner init` command to set up and register a repo
5. **Real-time sync** - File changes on disk reflected immediately in UI

### Non-Goals (MVP)

- Moving/copying diagrams between repos (future feature)
- Auto-discovery of repos (manual registration only)
- Multi-user collaboration features

---

## Detailed Requirements

### R1: Directory Structure

```
~/.aligner/
├── registry.json              # Central registry of all repos
└── global/                    # Diagrams not tied to any repo
    └── scratch.json

~/dev/orchestrator/.aligner/   # Git-tracked with repo
├── device-flow.json
└── gmp-media-flow.json

~/dev/aligner/.aligner/        # Git-tracked with repo
└── architecture.json
```

### R2: Global Diagrams

- **Purpose**: Both migration target for existing diagrams AND permanent location for repo-independent work
- **Use cases**: Scratch diagrams, cross-project references, temporary work
- **Always visible**: Global section always appears in sidebar

### R3: Repo Registration

- **Single command**: `aligner init` creates `.aligner/` and registers repo (idempotent)
- **Separate removal**: `aligner unregister` removes repo from registry
- **Manual only**: No auto-discovery; user explicitly registers each repo
- **Display name**: Defaults to directory name, customizable later

### R4: Sidebar Behavior

- **Grouped by repo**: Diagrams shown under collapsible repo sections
- **Collapsed by default**: Repos start collapsed for scalability
- **Search/filter**: Filter box to find diagrams across all repos
- **Missing repo warning**: Repos that can't be found shown grayed out with warning

### R5: Creating Diagrams

- **Prompt with context**: Show repo selection dialog, pre-select based on where Aligner was started
- **Global option**: Always available as a save destination

### R6: Name Handling

- **Duplicates allowed**: Same filename can exist in different repos
- **Repo grouping**: Makes names distinct in UI

### R7: Missing Repos

- **Visual indicator**: Show grayed out with "Not found" warning
- **Resolution prompt**: Click to locate new path or remove from registry

### R8: Real-Time Updates

- **File watching**: Watch all registered `.aligner/` directories
- **Auto-refresh**: Update sidebar and open diagram when files change

---

## Architecture Overview

```mermaid
graph TB
    subgraph "CLI"
        CLI[bin/aligner]
    end

    subgraph "Server"
        API[Express API]
        Registry[Registry Manager]
        Watcher[File Watcher]
    end

    subgraph "Frontend"
        App[App.tsx]
        Sidebar[RepoSidebar]
        Canvas[ReactFlow Canvas]
    end

    subgraph "Storage"
        RegFile[~/.aligner/registry.json]
        GlobalDir[~/.aligner/global/]
        RepoDir1[repo1/.aligner/]
        RepoDir2[repo2/.aligner/]
    end

    CLI --> RegFile
    CLI --> RepoDir1
    API --> Registry
    Registry --> RegFile
    Registry --> Watcher
    Watcher --> GlobalDir
    Watcher --> RepoDir1
    Watcher --> RepoDir2
    App --> API
    App --> Sidebar
    App --> Canvas
```

---

## Components and Interfaces

### 1. Registry Manager (Server)

**File**: `server/registry.js`

```typescript
interface Repo {
  path: string        // Absolute path to repo root
  name: string        // Display name
  addedAt: string     // ISO timestamp
}

interface Registry {
  version: string     // "1.0"
  repos: Repo[]
}

// Functions
async function loadRegistry(): Promise<Registry>
async function saveRegistry(registry: Registry): Promise<void>
async function registerRepo(path: string, name?: string): Promise<Repo>
async function unregisterRepo(path: string): Promise<void>
async function getAlignerDir(repoPath: string): string  // Returns repo/.aligner or global
```

### 2. File Watcher (Server)

**File**: `server/watcher.js`

```typescript
import chokidar from 'chokidar'

interface WatcherEvents {
  onDiagramAdded: (repo: string, filename: string) => void
  onDiagramChanged: (repo: string, filename: string) => void
  onDiagramDeleted: (repo: string, filename: string) => void
}

function createWatcher(paths: string[], events: WatcherEvents): chokidar.FSWatcher
function addPath(watcher: chokidar.FSWatcher, path: string): void
function removePath(watcher: chokidar.FSWatcher, path: string): void
```

### 3. API Endpoints (Server)

**File**: `server/index.js`

#### New Endpoints

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/repos` | GET | - | `{ repos: Repo[], missing: string[] }` |
| `/repos/register` | POST | `{ path: string, name?: string }` | `{ repo: Repo }` |
| `/repos/:encodedPath` | DELETE | - | `{ success: true }` |
| `/repos/:encodedPath` | PATCH | `{ name: string }` | `{ repo: Repo }` |

#### Modified Endpoints

| Endpoint | Method | Change |
|----------|--------|--------|
| `/diagrams` | GET | Returns `repo` and `repoPath` per diagram |
| `/diagram/:repo/:filename` | GET | `:repo` is URL-encoded path or "global" |
| `/diagram/:repo/:filename` | PUT | Same |
| `/diagram/:repo` | POST | Create in specific repo |
| `/diagram/:repo/:filename` | DELETE | Same |

### 4. CLI Commands

**File**: `bin/aligner`

```bash
# New commands
aligner init [--name "Display Name"]  # Create .aligner/ + register
aligner unregister                     # Remove CWD from registry
aligner repos                          # List registered repos

# Modified commands
aligner list                           # Show all diagrams grouped by repo
```

### 5. Frontend Components

**File**: `src/components/RepoSidebar.tsx`

```typescript
interface RepoGroup {
  path: string
  name: string
  diagrams: Diagram[]
  status: 'ok' | 'missing'
}

interface RepoSidebarProps {
  repos: RepoGroup[]
  selectedDiagram: string | null
  onSelectDiagram: (repo: string, filename: string) => void
  onCreateDiagram: () => void
  filter: string
  onFilterChange: (value: string) => void
}
```

**File**: `src/components/CreateDiagramModal.tsx`

```typescript
interface CreateDiagramModalProps {
  repos: Repo[]
  defaultRepo: string | null  // Pre-selected based on context
  onSubmit: (repo: string, name: string) => void
  onCancel: () => void
}
```

---

## Data Models

### Registry File (`~/.aligner/registry.json`)

```json
{
  "version": "1.0",
  "repos": [
    {
      "path": "/Users/dale/dev/orchestrator",
      "name": "Orchestrator",
      "addedAt": "2024-01-30T12:00:00Z"
    },
    {
      "path": "/Users/dale/dev/aligner",
      "name": "Aligner",
      "addedAt": "2024-01-30T12:05:00Z"
    }
  ]
}
```

### Diagram List Response (`GET /diagrams`)

```json
[
  {
    "filename": "device-flow.json",
    "name": "Device Flow",
    "repo": "Orchestrator",
    "repoPath": "/Users/dale/dev/orchestrator",
    "modified": "2024-01-30T14:30:00Z"
  },
  {
    "filename": "scratch.json",
    "name": "Scratch",
    "repo": "Global",
    "repoPath": "global",
    "modified": "2024-01-30T10:00:00Z"
  }
]
```

### Diagram Format (Unchanged)

The diagram JSON format remains unchanged. Repo context is determined by file location, not stored in the diagram.

---

## Error Handling

### Registry Errors

| Error | Handling |
|-------|----------|
| Registry file missing | Create with empty repos array |
| Registry file corrupt | Log error, start with empty registry, attempt backup |
| Write failure | Atomic write-and-rename; retry once |

### Repo Errors

| Error | Handling |
|-------|----------|
| Repo path doesn't exist | Mark as "missing" in UI, don't remove from registry |
| No `.aligner/` directory | For registration: create it. For existing: mark missing |
| Permission denied | Log error, mark as missing |

### API Errors

| Endpoint | Error | Response |
|----------|-------|----------|
| POST /repos/register | Path doesn't exist | 400 `{ error: "Path does not exist" }` |
| POST /repos/register | Already registered | 200 `{ repo: existingRepo }` (idempotent) |
| GET /diagram/:repo/:filename | Repo missing | 404 `{ error: "Repo not found" }` |
| GET /diagram/:repo/:filename | File missing | 404 `{ error: "Diagram not found" }` |

### File Watcher Errors

| Error | Handling |
|-------|----------|
| EMFILE (too many watchers) | Log warning, continue with reduced watching |
| Path becomes inaccessible | Mark repo as missing, stop watching |

---

## Testing Strategy

### Unit Tests

1. **Registry Manager**
   - Load/save registry
   - Register/unregister repos
   - Handle missing registry file
   - Handle corrupt registry

2. **Path Encoding**
   - Encode/decode repo paths
   - Handle special characters
   - Handle "global" keyword

### Integration Tests

1. **API Endpoints**
   - CRUD operations for repos
   - CRUD operations for diagrams with repo context
   - Error responses

2. **File Watcher**
   - Detect new files
   - Detect modified files
   - Detect deleted files
   - Handle multiple directories

### E2E Tests

1. **CLI Workflow**
   - `aligner init` creates directory and registers
   - `aligner init` is idempotent
   - `aligner unregister` removes from registry
   - `aligner repos` lists all repos

2. **UI Workflow**
   - Sidebar shows repos grouped
   - Creating diagram in specific repo
   - Missing repo warning display
   - Real-time updates when files change

### Migration Tests

1. Move existing `~/.aligner/*.json` to `~/.aligner/global/`
2. Preserve all diagram data
3. Handle partial migration (some files already moved)

---

## Appendices

### A. Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| File Watching | chokidar v5 | Industry standard, efficient, supports multiple directories |
| Path Encoding | encodeURIComponent | Built-in, reversible, handles all characters |
| Registry Format | JSON | Simple, human-readable, easy to debug |
| Atomic Writes | write-and-rename | POSIX atomic, prevents corruption |

### B. Research Findings Summary

1. **Crabwalk reference** - SessionList component provides excellent pattern for grouped sidebar with collapsible sections, search/filter, and status indicators

2. **Workspace patterns** - Registry file approach aligns with npm/pnpm workspaces pattern

3. **Chokidar best practices** - Use `depth: 0`, `ignoreInitial: true`, and `awaitWriteFinish` for optimal watching

### C. Alternative Approaches Considered

1. **SQLite for registry** - Rejected: Overkill for simple list of paths
2. **Auto-discovery** - Rejected: User prefers explicit control
3. **Separate init/register commands** - Rejected: Single idempotent command is simpler

### D. Existing Codebase Patterns

- **Server**: Express.js with ES modules, simple CRUD patterns
- **Frontend**: React functional components, hooks, Framer Motion animations
- **Styling**: CSS with custom classes, dark theme
- **Icons**: lucide-react

### E. Future Considerations

- Move/copy diagrams between repos
- Repo settings UI (rename, remove)
- Diagram search across all repos
- Export/import repos
