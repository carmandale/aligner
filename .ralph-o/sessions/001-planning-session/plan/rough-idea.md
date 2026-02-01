# Multi-Repo Registry Feature

**Source:** `.beads/feature-spec.md` (bead: aligner-ovr)

## Summary

Implement a registry system that allows Aligner to aggregate diagrams from multiple repositories while keeping diagrams git-tracked within each repo.

## Current Behavior

All diagrams stored in global `~/.aligner/` directory, not associated with any repo.

## Desired Behavior

- Diagrams stored in per-repo `.aligner/` directories (git-tracked)
- Global registry at `~/.aligner/registry.json` tracks registered repos
- UI groups diagrams by repo
- CLI commands to register/unregister repos
- Migration path for existing diagrams

## Key Components

1. **Server** - Multi-repo scanning, new API endpoints
2. **CLI** - init, register, unregister, repos commands
3. **Frontend** - Grouped sidebar, repo context for saves
4. **Migration** - Move existing diagrams to global/
