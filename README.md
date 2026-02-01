# ⚡ Aligner

Visual feedback loop for AI agents. You describe what you want, the AI generates a diagram, you edit it visually, and the AI sees your changes.

**Inspired by [CJ Hess's Flowy concept](https://x.com/seejayhess/status/2014448070214197485)**

## The Loop

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   AI Agent      │────────▶│  ~/.aligner/    │────────▶│   Browser UI    │
│  generates JSON │         │  diagram.json   │         │  renders flow   │
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

# Initialize multi-repo registry
npm run aligner init

# Start (two terminals)
# Terminal 1: API server
cd server && node index.js

# Terminal 2: Web UI
npm run dev

# Open browser
open http://localhost:5173
```

## Features

- **Interactive canvas** - Drag nodes, create connections, delete with backspace
- **Threaded comments** - Click a node, add comments, AI can reply
- **Real-time sync** - Visual edits save to JSON automatically
- **AI-readable** - Simple JSON format any LLM can generate and parse
- **Multi-repo support** - Manage diagrams across multiple repositories from one UI

## Multi-Repo Support

Aligner can manage diagrams across multiple repositories from a single UI. Each repo gets its own `.aligner/` directory, and diagrams are grouped by repository in the UI.

### Setup

```bash
# Initialize the registry (creates ~/.aligner/registry.json)
npm run aligner init

# Register a repository
npm run aligner register /path/to/my-repo

# List registered repos
npm run aligner repos

# List all diagrams across all repos
npm run aligner list

# Unregister a repo
npm run aligner unregister /path/to/my-repo
```

### How It Works

- **Registry**: `~/.aligner/registry.json` tracks all registered repos
- **Global diagrams**: Stored in `~/.aligner/global/`
- **Repo diagrams**: Each repo stores diagrams in `.aligner/` (gitignored by default)
- **File watcher**: Monitors all registered repos for diagram changes
- **WebSocket**: Real-time updates push changes to all connected browsers
- **UI grouping**: Diagrams grouped by repository with collapsible sections

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
cat ~/.aligner/my-diagram.json | jq '.nodes[] | select(.comments) | {label, comments}'
```

### Generating a Diagram

Prompt your AI:

```
Create an Aligner diagram showing a user login flow.
Save it to ~/.aligner/login-flow.json

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

All commands are run via `npm run aligner <command>`:

| Command | Description |
|---------|-------------|
| `init` | Initialize multi-repo registry (`~/.aligner/registry.json`) |
| `register <path>` | Register a repository for diagram tracking |
| `unregister <path>` | Remove a repository from tracking |
| `repos` | List all registered repositories |
| `list` | List all diagrams across all repos |

## API Endpoints

The server runs on port 3001:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/diagrams` | List all diagrams (grouped by repo) |
| `GET` | `/diagram/:repoId/:filename` | Get diagram JSON from specific repo |
| `PUT` | `/diagram/:repoId/:filename` | Update diagram in specific repo |
| `POST` | `/diagram/:repoId` | Create new diagram in specific repo |
| `DELETE` | `/diagram/:repoId/:filename` | Delete diagram from specific repo |
| `GET` | `/repos` | List all registered repositories |

**WebSocket**: Connect to `ws://localhost:3001` for real-time diagram updates.

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
