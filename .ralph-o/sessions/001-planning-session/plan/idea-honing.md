# Requirements Clarification

This document captures Q&A from the requirements clarification process.

---

## Q1: Global Diagrams - Long-term Role

The spec mentions a `~/.aligner/global/` directory for diagrams not tied to any repo.

**Question:** Should "Global" be a permanent feature for repo-independent diagrams (scratch work, reference diagrams), or is it primarily a migration target for existing diagrams that can later be moved into repos?

**Options:**
- A) Permanent feature - users can intentionally save diagrams to Global
- B) Migration-only - eventually all diagrams should be in repos
- C) Both - migration target, but also available for scratch/temporary work

**Answer:** C) Both - Global serves as a migration target for existing diagrams AND remains available for scratch/temporary work that doesn't belong to any specific repo.

---

## Q2: Default Save Location

When a user creates a new diagram, they'll need to choose where to save it.

**Question:** Should there be a "default" repo for quick saves, or should the user always explicitly choose a repo/global?

**Options:**
- A) Always prompt - user must choose repo or Global every time
- B) Remember last used - default to the last repo the user saved to
- C) Current context - if Aligner was started from a repo directory, default to that repo
- D) Configurable default - user can set a preferred default repo

**Answer:** Prompt based on current context - Show the repo selection prompt, but pre-select/suggest the repo based on where Aligner was started from (if applicable). User still confirms or changes the selection.

---

## Q3: Handling Missing/Moved Repos

Repos can be moved, renamed, or deleted on disk after being registered.

**Question:** How should Aligner handle a registered repo that no longer exists at its path?

**Options:**
- A) Silent skip - just don't show it, no error
- B) Show warning - display the repo grayed out with "Not found" indicator
- C) Prompt to fix - ask user to locate the repo or remove from registry
- D) Auto-remove - automatically unregister repos that can't be found

**Answer:** B + C - Show the repo grayed out with a "Not found" warning indicator, AND when clicked/expanded, prompt the user to either locate the repo at its new path or remove it from the registry.

---

## Q4: Diagram Name Conflicts

Different repos could have diagrams with the same filename (e.g., both "orchestrator" and "aligner" repos have a "data-flow.json").

**Question:** How should duplicate diagram names across repos be handled in the UI?

**Options:**
- A) No issue - repo grouping makes them distinct, just show the name
- B) Show repo prefix - display as "Orchestrator / data-flow" in lists
- C) Require unique names globally - prevent creating duplicates across repos

**Answer:** A) No issue - Repo grouping in the sidebar makes diagrams distinct. Each diagram is shown within its repo section, so duplicate names across repos are fine.

---

## Q5: Moving Diagrams Between Repos

A user might want to move a diagram from Global to a specific repo, or between repos.

**Question:** Should there be a way to move/copy diagrams between repos?

**Options:**
- A) Not needed - user can manually copy files on disk
- B) Move only - provide a "Move to..." action in the UI
- C) Move and Copy - provide both "Move to..." and "Copy to..." actions
- D) Future feature - skip for MVP, add later

**Answer:** D) Future feature - Skip move/copy functionality for MVP. Users can manually copy files on disk if needed. Add UI support in a future iteration.

---

## Q6: Sidebar Scaling

As users register more repos, the sidebar could get crowded.

**Question:** How should the sidebar handle many repos (e.g., 10+ repos with multiple diagrams each)?

**Options:**
- A) Simple scroll - just scroll, no special handling
- B) Collapse by default - repos start collapsed, user expands as needed
- C) Search/filter - add search box to filter repos and diagrams
- D) Both B + C - collapsed by default with search/filter

**Answer:** D) Both - Repos collapsed by default (user expands as needed) AND a search/filter box to quickly find diagrams across all repos. Similar to crabwalk's SessionList pattern.

---

## Q7: CLI Registration Flow

The spec mentions `aligner init` and `aligner register` as separate commands.

**Question:** What should the difference be between these commands?

**Options:**
- A) `init` creates .aligner/ + registers; `register` only registers (requires existing .aligner/)
- B) Only need `init` - it handles both creating directory and registering
- C) Only need `register` - it creates .aligner/ if missing and registers

**Answer:** B) Single `aligner init` command - Creates `.aligner/` if needed AND registers the repo. Idempotent like `git init` - safe to run multiple times. Reports what it did. Keep `unregister` as a separate explicit command for removal.

---

## Q8: Auto-Discovery vs Manual Registration

Should Aligner automatically discover repos with `.aligner/` directories, or require explicit registration?

**Question:** How should repos be discovered?

**Options:**
- A) Manual only - user must run `aligner init` in each repo
- B) Auto-discover - scan common locations (~/dev/, ~/projects/) for .aligner/ dirs
- C) Hybrid - manual registration, but offer "Scan for repos" in UI

**Answer:** A) Manual only - User must explicitly run `aligner init` in each repo. Keeps control explicit and avoids unexpected repos appearing. Simple and predictable.

---

## Q9: Real-Time File Watching

The server could watch registered `.aligner/` directories for changes made outside Aligner (e.g., git pull brings new diagrams).

**Question:** Should the UI auto-refresh when files change on disk?

**Options:**
- A) Yes, real-time - Watch all registered dirs, auto-refresh sidebar and open diagrams
- B) Sidebar only - Auto-refresh diagram list, but require manual reload for open diagram
- C) Manual refresh - Add a "Refresh" button, no automatic watching
- D) Future feature - Skip for MVP

**Answer:** A) Yes, real-time - Watch all registered `.aligner/` directories using chokidar. Auto-refresh both sidebar (diagram list) and currently open diagram when files change on disk.

---

## Q10: Repo Display Names

When registering a repo, should users be able to set a custom display name?

**Question:** How should repo names be determined?

**Options:**
- A) Directory name only - use the repo folder name (e.g., "orchestrator")
- B) Custom name required - prompt for display name during `aligner init`
- C) Smart default + editable - default to directory name, but allow customization later

**Answer:** C) Smart default + editable - Default to directory name during `aligner init`, but store in registry so it can be customized later (via CLI or future UI settings).

