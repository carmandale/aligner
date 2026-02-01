# Aligner Codebase Deep-Dive

## Current Architecture

```
aligner/
├── server/index.js    # Express API server
├── bin/aligner        # CLI entry point (bash)
├── src/
│   ├── App.tsx        # Main React component
│   ├── main.tsx       # React entry point
│   └── components/
│       └── AlignerNode.tsx  # Custom ReactFlow node
└── public/            # Static assets
```

## Server (server/index.js)

**Tech:** Express.js, ES modules

### Current State

- Single directory: `~/.aligner/`
- No registry or multi-repo support
- Simple CRUD operations

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/diagrams` | GET | List all `.json` files |
| `/diagram/:filename` | GET | Read single diagram |
| `/diagram/:filename` | PUT | Update diagram |
| `/diagram` | POST | Create new diagram |
| `/diagram/:filename` | DELETE | Delete diagram |

### Changes Needed for Multi-Repo

1. **Startup** - Read `registry.json`, scan registered repos
2. **New endpoints** - `/repos`, `/repos/register`, `/repos/:encodedPath`
3. **Modified endpoints** - `/diagrams` returns repo context, `/diagram/:repo/:filename`
4. **File watching** - Watch multiple `.aligner/` directories with chokidar

## CLI (bin/aligner)

**Tech:** Bash script

### Current Commands

- `aligner start` - Start server + viewer
- `aligner server` - Start only server
- `aligner viewer` - Start only viewer
- `aligner list` - List diagrams from `~/.aligner/`
- `aligner open` - Open browser

### Changes Needed for Multi-Repo

New commands:
- `aligner init` - Create `.aligner/` in CWD, register repo
- `aligner register` - Add CWD to registry
- `aligner unregister` - Remove CWD from registry
- `aligner repos` - List registered repos

## Frontend (src/App.tsx)

**Tech:** React, ReactFlow, Framer Motion

### Current State

- Flat list of diagrams in sidebar
- No repo grouping or filtering
- Single API endpoint for all diagrams

### Component Structure

```
App
├── Header (logo, tagline)
└── Main
    ├── Sidebar
    │   ├── Diagram list (flat)
    │   ├── Add node form
    │   ├── Comment panel (selected node)
    │   └── Active threads
    └── Canvas (ReactFlow)
```

### State

```typescript
const [diagrams, setDiagrams] = useState([])  // {filename, name}[]
const [file, setFile] = useState(null)        // current diagram filename
const [diagram, setDiagram] = useState(null)  // full diagram data
const [nodes, setNodes] = useNodesState([])
const [edges, setEdges] = useEdgesState([])
const [selected, setSelected] = useState(null) // selected node ID
```

### Changes Needed for Multi-Repo

1. **Diagram type** - Add `repo` and `repoPath` fields
2. **Sidebar** - Group by repo, collapsible sections
3. **Repo filter** - Filter chips like crabwalk's platform filters
4. **New diagram modal** - Choose repo when creating
5. **Save logic** - Include repo in API calls

## AlignerNode Component

Custom ReactFlow node with:
- Comment indicator badge
- Framer Motion animations
- Handles (top/bottom) for connections

**No changes needed** for multi-repo feature.

## Data Model

### Current Diagram Format

```json
{
  "version": "1.0",
  "name": "My Diagram",
  "nodes": [
    {
      "id": "node-1",
      "type": "rect",
      "label": "Start",
      "position": { "x": 100, "y": 100 },
      "size": { "width": 150, "height": 50 },
      "style": { "fill": "#f3f4f6", "stroke": "#6b7280" },
      "comments": [{ "from": "user", "text": "..." }]
    }
  ],
  "edges": [
    {
      "id": "e-1",
      "from": "node-1",
      "to": "node-2",
      "type": "arrow"
    }
  ],
  "metadata": {
    "created": "2024-01-30T...",
    "modified": "2024-01-30T..."
  }
}
```

**No changes needed** to diagram format itself - repo context is determined by file location.

## Dependencies

Current:
- express, cors (server)
- react, react-dom
- @xyflow/react (ReactFlow)
- framer-motion
- lucide-react (icons)

To add:
- chokidar (file watching)
