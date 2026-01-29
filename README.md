# ⚡ Aligner

Visual feedback loop for AI agents. Claude (or any AI) writes JSON, you edit visually, changes sync back.

**Inspired by [CJ Hess's Flowy concept](https://x.com/seejayhess/status/2014448070214197485)**

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│   ~/.aligner/   │────▶│   Browser UI    │
│  writes JSON    │     │   diagram.json  │     │  renders flow   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                       │                       │
         │                       │                       ▼
         │               ┌───────┴───────┐       ┌─────────────────┐
         └───────────────│   File Sync   │◀──────│  User drags     │
                         │   (watches)   │       │  nodes around   │
                         └───────────────┘       └─────────────────┘
```

1. **Agent writes JSON** → `~/.aligner/my-diagram.json`
2. **Aligner renders** → Interactive flowchart in browser
3. **You edit visually** → Drag nodes, adjust layout
4. **JSON updates** → File syncs automatically
5. **Agent reads changes** → Continues iteration

## Quick Start

```bash
# Clone and install
git clone https://github.com/carmandale/aligner.git
cd aligner
npm install
cd server && npm install && cd ..

# Start both server and viewer
./bin/aligner start

# Or run separately
./bin/aligner server    # Terminal 1: API server on :3001
./bin/aligner viewer    # Terminal 2: Web UI on :5173
```

Open http://localhost:5173

## JSON Schema

Aligner uses a simple JSON format that's easy for LLMs to generate:

```json
{
  "version": "1.0",
  "name": "My Flow",
  "type": "flowchart",
  "nodes": [
    {
      "id": "node-1",
      "type": "rect",
      "label": "Start Here",
      "position": { "x": 100, "y": 100 },
      "size": { "width": 150, "height": 60 },
      "style": {
        "fill": "#dbeafe",
        "stroke": "#3b82f6",
        "cornerRadius": 8
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "from": "node-1",
      "to": "node-2",
      "type": "arrow",
      "label": "next"
    }
  ],
  "metadata": {
    "description": "What this diagram shows"
  }
}
```

### Node Types
- `rect` - Rectangle
- `circle` - Circle
- `diamond` - Decision diamond
- `text` - Text label
- `group` - Container for nested nodes

### Edge Types
- `arrow` - Solid line with arrow
- `dashed` - Dashed line with arrow
- `line` - Solid line, no arrow
- `orthogonal` - Right-angle connections
- `curved` - Bezier curves

### Style Options
- `fill` - Background color
- `stroke` - Border color
- `strokeWidth` - Border thickness
- `cornerRadius` - Rounded corners (for rect)
- `fontSize` - Text size
- `fontColor` - Text color
- `shadow` - Drop shadow (boolean)

## Use with AI Agents

### Example Prompt for Claude

```
Create a flowchart in Aligner JSON format showing a user authentication flow.
Save it to ~/.aligner/auth-flow.json

Use the schema:
- nodes: array of {id, type, label, position, size, style}
- edges: array of {id, from, to, type, label}
- Node types: rect, circle, diamond
- Edge types: arrow, dashed
```

### Claude Code Skill

Create `~/.agent-config/skills/aligner/SKILL.md`:

```markdown
# Aligner - Visual Diagram Editor

Generate flowcharts and UI mockups in Aligner JSON format.

## Schema
[... include the JSON schema ...]

## Usage
Write JSON to ~/.aligner/<name>.json
User views/edits at http://localhost:5173
Read back to see their changes
```

## CLI Commands

```bash
aligner start     # Start server + viewer
aligner server    # Start only API server
aligner viewer    # Start only web UI
aligner list      # List all diagrams
aligner open      # Open browser
aligner help      # Show help
```

## Directory Structure

```
~/.aligner/               # Your diagrams live here
├── example-flow.json
├── auth-flow.json
└── ui-mockup.json

~/dev/aligner/            # The app
├── src/                  # React frontend
├── server/               # Express API
└── bin/aligner           # CLI
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/diagrams` | List all diagrams |
| GET | `/diagram/:filename` | Get diagram JSON |
| PUT | `/diagram/:filename` | Update diagram |
| POST | `/diagram` | Create new diagram |
| DELETE | `/diagram/:filename` | Delete diagram |

## License

MIT
