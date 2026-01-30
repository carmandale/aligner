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

## JSON Schema

Diagrams are stored in `~/.aligner/` as JSON files:

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

## API Endpoints

The server runs on port 3001:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/diagrams` | List all diagrams |
| `GET` | `/diagram/:filename` | Get diagram JSON |
| `PUT` | `/diagram/:filename` | Update diagram |
| `POST` | `/diagram` | Create new diagram |
| `DELETE` | `/diagram/:filename` | Delete diagram |

## Project Structure

```
~/.aligner/                    # Your diagrams
├── example-flow.json
└── my-diagram.json

~/dev/aligner/                 # The app
├── src/
│   ├── App.tsx                # Main React component
│   ├── components/
│   │   └── AlignerNode.tsx    # Custom node with animations
│   └── styles.css             # Tailwind + custom styles
├── server/
│   └── index.js               # Express API server
└── package.json
```

## Tech Stack

- **Frontend**: React, Vite, ReactFlow, Framer Motion, Tailwind CSS
- **Backend**: Express.js, file system watcher
- **Icons**: Lucide React

## License

MIT
