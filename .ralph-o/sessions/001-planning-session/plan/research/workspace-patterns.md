# Multi-Workspace Patterns Research

## Overview

Researched how similar tools aggregate content from multiple sources.

## 1. Monorepo/Workspace Tools

**Sources:**
- [Turborepo Docs](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [npm Workspaces Guide](https://geekyants.com/blog/managing-multiple-packages-with-npm-workspaces-a-complete-guide)

### Key Pattern: Registry File at Root

All workspace tools use a root configuration file:
- **pnpm**: `pnpm-workspace.yaml`
- **npm**: `package.json` with `workspaces` array
- **Turborepo**: `turbo.json` + workspace config

### Applicable Pattern for Aligner

```
~/.aligner/
├── registry.json    ← Central registry (like pnpm-workspace.yaml)
└── global/          ← Diagrams not tied to any repo
    └── scratch.json
```

Each registered repo has its own `.aligner/` directory (like each package has its own `package.json`).

## 2. VSCode Multi-Root Workspaces

**Concept:** A `.code-workspace` file lists multiple folders to open together.

```json
{
  "folders": [
    { "path": "/Users/dale/dev/project-a" },
    { "path": "/Users/dale/dev/project-b" }
  ]
}
```

### Applicable Pattern for Aligner

The registry.json serves a similar purpose:
- Lists all "workspace members" (repos)
- Each member has a display name
- Central place to add/remove repos

## 3. Note-Taking Apps (Obsidian, Notion)

### Obsidian Vaults

- Each vault is a separate directory
- User can switch between vaults
- No cross-vault aggregation (unlike Aligner's goal)

### Notion Workspaces

- Multiple workspaces, each with own pages/databases
- Sidebar shows current workspace
- Can switch workspaces

### Applicable Pattern

Aligner differs by showing ALL repos simultaneously in one view (aggregated), rather than switching between them.

## 4. Design Decision: Aggregated vs. Switched

| Approach | Pros | Cons |
|----------|------|------|
| **Aggregated** (Aligner's choice) | See everything at once, compare across repos | More complex UI, performance with many repos |
| **Switched** | Simple UI, clear context | Can't see cross-repo patterns |

The feature spec chooses **aggregated** with repo grouping, which is the right call for a visual feedback tool.

## Summary

Aligner's approach is most similar to:
1. **VSCode multi-root workspaces** (registry pattern)
2. **pnpm/npm workspaces** (registry file + per-project directories)

Key difference: Aligner aggregates in UI, not just in the file system structure.
