# Multi-Repo Registry Feature - Planning Summary

## Overview

This planning session transformed the `aligner-ovr` bead (multi-repo registry feature) into a comprehensive design and implementation plan.

## Artifacts Created

```
.ralph-o/sessions/001-planning-session/plan/
├── rough-idea.md                    # Initial feature concept
├── idea-honing.md                   # 10 Q&A requirements decisions
├── research/
│   ├── crabwalk-reference.md        # Grouped sidebar patterns
│   ├── technical-patterns.md        # Chokidar, path encoding, registry
│   ├── workspace-patterns.md        # Multi-workspace approaches
│   └── aligner-codebase.md          # Current architecture analysis
├── design/
│   └── detailed-design.md           # Full design document
├── implementation/
│   └── plan.md                      # 14-step implementation plan
└── summary.md                       # This document
```

## Key Design Decisions

| Decision | Choice |
|----------|--------|
| Global diagrams | Permanent feature + migration target |
| Default save | Prompt with context pre-selected |
| Missing repos | Warning + prompt to fix |
| CLI commands | Single `aligner init` (idempotent) |
| Sidebar | Collapsed by default + search/filter |
| File watching | Real-time with chokidar |
| Repo names | Smart default + editable |

## Implementation Overview

**14 steps** organized into phases:

1. **Foundation (Steps 1-4)**: Registry manager, API, CLI init, migration
2. **Backend Features (Steps 5-7)**: Multi-repo listing, repo-aware CRUD, file watcher
3. **Frontend (Steps 8-11)**: Grouped sidebar, create modal, search/filter, missing repo handling
4. **Finishing (Steps 12-14)**: CLI commands, real-time updates, polish

Each step produces working, demoable functionality.

## Files to Modify

| File | Changes |
|------|---------|
| `server/index.js` | New endpoints, registry integration |
| `server/registry.js` | NEW - Registry manager |
| `server/watcher.js` | NEW - Chokidar file watching |
| `server/migration.js` | NEW - Migration logic |
| `bin/aligner` | New commands: init, unregister, repos |
| `src/App.tsx` | Integrate new sidebar, create modal |
| `src/components/RepoSidebar.tsx` | NEW - Grouped sidebar |
| `src/components/CreateDiagramModal.tsx` | NEW - Repo selection |
| `README.md` | Document multi-repo feature |

## Dependencies to Add

- `chokidar` (file watching)

## Success Criteria

1. ✅ Diagrams in repo `.aligner/` directories are git-trackable
2. ✅ UI shows all diagrams grouped by repo
3. ✅ Creating a diagram saves to the correct repo
4. ✅ CLI can init/unregister repos
5. ✅ Old diagrams migrate to global on upgrade
6. ✅ Real-time updates when files change

## Next Steps

1. Review the detailed design: `.ralph-o/sessions/001-planning-session/plan/design/detailed-design.md`
2. Review the implementation plan: `.ralph-o/sessions/001-planning-session/plan/implementation/plan.md`
3. Run `ralph-o task` to generate structured code tasks
4. Run `ralph-o run` to execute implementation

## Related

- **Bead**: `aligner-ovr`
- **Original spec**: `.beads/feature-spec.md`
