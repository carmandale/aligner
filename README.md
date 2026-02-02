# ⚡ Aligner

Visual feedback loop for AI agents. You describe what you want, the AI generates a diagram, you edit it visually, and the AI sees your changes.

**Inspired by [CJ Hess's Flowy concept](https://x.com/seejayhess/status/2014448070214197485)**

## The Loop

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   AI Agent      │────────▶│ ~/.aligner/     │────────▶│   Browser UI    │
│  generates JSON │         │  global/*.json  │         │  renders flow   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         ▲                                                       │
         │                                                       │
         │                  ┌─────────────────┐                  │
         └──────────────────│   You edit &    │◀─────────────────┘
                            │   comment       │
                            └─────────────────┘
```

## Quick Start

```bash
# Clone
git clone https://github.com/carmandale/aligner.git
cd aligner

# Install dependencies
npm install
cd server && npm install && cd ..

# Start API server + viewer (single command)
npm start
# or: ./bin/aligner start
# This also installs the "aligner" command if a writable PATH dir is available.

# Open browser
open http://127.0.0.1:5173
```

### Track this repo (optional)

```bash
./bin/aligner init
```

## Configuration

Aligner defaults to 127.0.0.1 (not localhost) to avoid IPv6 ambiguity.

### Ports

- Server port: `PORT` (default `3001`)
- Viewer port: `ALIGNER_VIEWER_PORT` (default `5173`)

The viewer is started with `--strictPort`, so if `5173` is taken Vite will fail instead of choosing another port.

### Frontend API/WS URLs

The viewer reads these Vite env vars:

- `VITE_ALIGNER_API_URL` (default `http://127.0.0.1:3001`)
- `VITE_ALIGNER_WS_URL` (default derived from the API URL: `ws://...` or `wss://...`)

When you start the viewer via `aligner start` or `aligner viewer`, `bin/aligner` will set `VITE_ALIGNER_API_URL` and `VITE_ALIGNER_WS_URL` automatically based on `PORT`, unless you explicitly override them. Trailing slashes are trimmed.

Examples:

```bash
# Run everything on non-default ports
PORT=4001 ALIGNER_VIEWER_PORT=5174 ./bin/aligner start

# Viewer pointed at a custom server
VITE_ALIGNER_API_URL="http://127.0.0.1:4001" \
VITE_ALIGNER_WS_URL="ws://127.0.0.1:4001" \
ALIGNER_VIEWER_PORT=5174 \
./bin/aligner viewer
```

## Features

- **Interactive canvas** - Drag nodes, create connections, delete with backspace
- **Threaded comments** - Click a node, add comments, AI can reply
- **Real-time sync** - Visual edits save to JSON automatically
- **AI-readable** - Simple JSON format any LLM can generate and parse
- **Multi-repo support** - Manage diagrams across multiple repositories from one UI

## Multi-Repo Support

Aligner can manage diagrams across multiple repositories from a single UI. Each repo gets its own `.aligner/` directory, and diagrams are grouped by repository in the UI.

Note: The commands below assume `aligner` is on your PATH. Running `npm start` once will install it; otherwise use `./bin/aligner`.

### Setup

```bash
# In each repo you want to track:
cd /path/to/my-repo
aligner init --name "My Repo"   # creates .aligner/ + registers it (idempotent)

# If .aligner/ already exists:
aligner register --name "My Repo"

# Inspect registry
aligner repos

# List diagrams across all repos + global
aligner list

# Remove a repo from tracking (does not delete .aligner/)
aligner unregister
```

### How It Works

- **Registry**: `~/.aligner/registry.json` tracks all registered repos
- **Global diagrams**: Stored in `~/.aligner/global/`
- **Repo diagrams**: Each repo stores diagrams in `.aligner/` (gitignored by default)
- **File watcher**: Monitors all registered repos for diagram changes
- **WebSocket**: Real-time updates push changes to all connected browsers
- **UI grouping**: Diagrams grouped by repository with collapsible sections

### Note on older diagram locations

If you have older diagrams directly under `~/.aligner/` (for example `~/.aligner/foo.json`), the server will move them into `~/.aligner/global/` on startup.

## JSON Schema

Diagrams are stored as JSON files in either `~/.aligner/global/` or a repo's `.aligner/` directory:

```json
{
  "version": "1.0",
  "name": "My Diagram",
  "type": "flowchart",
  "nodes": [
    {
      "id": "node-1",
      "type": "rect",
      "label": "Start Here",
      "position": { "x": 100, "y": 100 },
      "size": { "width": 150, "height": 50 },
      "style": {
        "fill": "#dbeafe",
        "stroke": "#3b82f6",
        "cornerRadius": 8
      },
      "comments": [
        { "from": "user", "text": "Should this be the entry point?" },
        { "from": "agent", "text": "Yes, all flows start here." }
      ]
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "from": "node-1",
      "to": "node-2",
      "type": "arrow",
      "label": "next step"
    }
  ],
  "metadata": {
    "description": "What this diagram represents",
    "created": "2024-01-01T00:00:00.000Z",
    "modified": "2024-01-01T00:00:00.000Z"
  }
}
```

### Node Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | string | `rect`, `circle`, `diamond` |
| `label` | string | Text displayed (supports `\n` for newlines) |
| `position` | object | `{ x: number, y: number }` |
| `size` | object | `{ width: number, height: number }` |
| `style.fill` | string | Background color (hex) |
| `style.stroke` | string | Border color (hex) |
| `style.cornerRadius` | number | Border radius in pixels |
| `comments` | array | Thread of `{ from: "user"|"agent", text: string }` |

### Edge Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `from` | string | Source node ID |
| `to` | string | Target node ID |
| `type` | string | `arrow`, `dashed`, `line` |
| `label` | string | Text on the edge (optional) |

## Using with AI Agents

### Reading Comments

```bash
# Check for user feedback
cat ~/.aligner/global/my-diagram.json | jq '.nodes[] | select(.comments) | {label, comments}'
```

### Generating a Diagram

Prompt your AI:

```
Create an Aligner diagram showing a user login flow.
Save it to ~/.aligner/global/login-flow.json

Use this format:
- nodes: array with id, type, label, position, size, style
- edges: array with id, from, to, type
- Node types: rect, circle, diamond
- Edge types: arrow, dashed
```

### Replying to Comments

When you read a user comment, add your reply to the comments array:

```json
{
  "comments": [
    { "from": "user", "text": "Is this correct?" },
    { "from": "agent", "text": "Yes, I verified this matches the codebase." }
  ]
}
```

## CLI Commands

From this repo, run:

- `./bin/aligner <command>` (recommended for development)
- `npm start` (equivalent to `./bin/aligner start`)

Running `npm start` (or `./bin/aligner start`) installs the `aligner` command into the first writable directory on your PATH (for example `~/.local/bin` or `/opt/homebrew/bin`). After that, you can run `aligner init --name "My Repo"` in any repo.

If no writable PATH dir is available, use `./bin/aligner` directly or add one to PATH and re-run.

Commands shown as `aligner <cmd>` below assume it is on your PATH.

| Command | Description |
|---------|-------------|
| `aligner start` | Start API server + viewer (viewer uses `--strictPort`) |
| `aligner server` | Start only the API server |
| `aligner viewer` | Start only the web viewer |
| `aligner open` | Open the viewer URL (`http://127.0.0.1:$ALIGNER_VIEWER_PORT`) |
| `aligner init` | Create `.aligner/` in the current directory and register it |
| `aligner register` | Register current directory (requires `.aligner/`) |
| `aligner unregister` | Unregister current directory |
| `aligner repos` | List registered repositories + status |
| `aligner list` | List all diagrams (global + registered repos) |
| `aligner help` | Show help |

## Dev workflow

If you want to run the API server and viewer separately, use two terminals:

```bash
# Terminal 1: API server
cd server
PORT=3001 node index.js

# Terminal 2: Web UI
cd ..
VITE_ALIGNER_API_URL="http://127.0.0.1:3001" \
VITE_ALIGNER_WS_URL="ws://127.0.0.1:3001" \
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

## API Endpoints

The server runs on `PORT` (default `3001`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/diagrams` | List all diagrams (grouped by repo) |
| `GET` | `/diagram/:repo/:filename` | Get diagram JSON from specific repo |
| `PUT` | `/diagram/:repo/:filename` | Update diagram in specific repo |
| `POST` | `/diagram/:repo` | Create new diagram in specific repo |
| `DELETE` | `/diagram/:repo/:filename` | Delete diagram from specific repo |
| `GET` | `/repos` | List all registered repositories |

### Repo identifier (`:repo`)

For repo-aware routes, `:repo` is either:

- `global` (uses `~/.aligner/global/`)
- a URL-encoded absolute repo path (uses `<repoPath>/.aligner/`)

Example:

```bash
REPO="/tmp/my-repo"
REPO_ID=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$REPO")
curl "http://127.0.0.1:3001/diagram/$REPO_ID/my-diagram.json"
```

**WebSocket**: Connect to `ws://127.0.0.1:3001` for real-time diagram updates.

## Project Structure

```
~/.aligner/                          # Aligner home
├── registry.json                    # Multi-repo registry
└── global/                          # Global diagrams
    ├── example-flow.json
    └── my-diagram.json

/path/to/my-repo/                    # Your project repo
└── .aligner/                        # Repo-specific diagrams
    └── feature-diagram.json

~/dev/aligner/                       # The app
├── bin/
│   ├── aligner                      # CLI entry point
│   ├── aligner-init.js              # Init command
│   ├── aligner-register.js          # Register command
│   └── ...                          # Other CLI commands
├── src/
│   ├── App.tsx                      # Main React component
│   ├── components/
│   │   ├── AlignerNode.tsx          # Custom node with animations
│   │   └── CreateDiagramModal.tsx   # Create diagram modal
│   └── styles.css                   # Tailwind + custom styles
├── server/
│   ├── index.js                     # Express API server + WebSocket
│   ├── registry.js                  # Registry manager
│   └── watcher.js                   # File watcher (chokidar)
└── package.json
```

## Tech Stack

- **Frontend**: React, Vite, ReactFlow, Framer Motion, Tailwind CSS
- **Backend**: Express.js, file system watcher
- **Icons**: Lucide React

## License

MIT
