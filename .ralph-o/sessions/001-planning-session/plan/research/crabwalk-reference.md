# Crabwalk Project Reference

**Source:** `/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/crabwalk`

## Overview

Crabwalk is a real-time companion monitor for AI agents using ReactFlow. It shows agent sessions and actions in a live node graph.

## Tech Stack

- TanStack Start (meta-framework)
- ReactFlow (same as Aligner)
- Framer Motion
- tRPC (server communication)
- TanStack DB

## Relevant Patterns for Multi-Repo Feature

### 1. Grouped Sidebar (SessionList.tsx)

The `SessionList` component shows a **hierarchical list** that groups items:

```tsx
// Parent sessions at top level
// Subagents nested underneath their parent
// Collapsible groups with chevron icons
// Status indicators per item
```

**Key features:**
- Platform filters (All / WhatsApp / Telegram / etc.)
- Search/filter input
- Collapsible nested groups with `collapsedGroups` state
- Status indicators per session
- Collapsed sidebar mode (icon-only view)

### 2. Component Structure

```
SessionList
├── Header (title, collapse button)
├── Filter input
├── Platform filter chips
└── Session items
    ├── Main sessions
    └── Subagents (nested, collapsible)
```

### 3. State Management

Uses local state + parent callbacks:
- `selectedKey` - currently selected item
- `onSelect` - selection callback
- `collapsed` - sidebar collapsed state
- Internal: `filter`, `platformFilter`, `collapsedGroups`

### 4. Animation Patterns

Uses Framer Motion for:
- List items entering/exiting (`AnimatePresence`)
- Sidebar width transitions
- Collapsible group height animations

## Applicability to Aligner

The SessionList pattern maps well to Aligner's needs:
- **Repos** → equivalent to **platforms**
- **Diagrams** → equivalent to **sessions**
- Collapsible repo groups with diagram items underneath
- Filter by repo or search across all

### Suggested Sidebar Structure for Aligner

```
┌─────────────────────────────────┐
│ Diagrams                    [◀] │
├─────────────────────────────────┤
│ [Filter diagrams...]            │
├─────────────────────────────────┤
│ [All] [Orchestrator] [Global]   │  ← Repo filter chips
├─────────────────────────────────┤
│ 📁 Orchestrator            [▼]  │  ← Collapsible group
│   ├── device-flow               │
│   └── gmp-media-flow            │
│ 📁 Global                  [▼]  │
│   └── scratch                   │
└─────────────────────────────────┘
```
