# Investigation: Chart Visual Styling - Grid Alignment & Spacing

## Summary
Charts are functionally correct but visually poor due to: (1) node sizes from JSON being ignored, (2) no snap-to-grid functionality, (3) misaligned grid background, and (4) basic edge routing.

## Symptoms
- Nodes don't respect `size` property from JSON
- Manual x/y positioning leads to inconsistent spacing
- Background grid is purely decorative (no snapping)
- Container boxes and child nodes have no visual hierarchy
- Edge routing creates visual clutter

## Root Cause

### 1. Node Size Ignored
**File:** `src/App.tsx:113-125`

```typescript
// CURRENT: size is NOT passed
setNodes(d.nodes.map(n => ({
  id: n.id,
  type: 'aligner',
  position: n.position,
  data: {
    label: n.label,
    comments: n.comments || [],
    style: { ... },
  },
})))
```

The `n.size` property is completely ignored when transforming diagram nodes to ReactFlow nodes.

### 2. No Snap-to-Grid
**File:** `src/App.tsx:719-730`

```typescript
// CURRENT: No snap configuration
<ReactFlow
  nodes={nodes}
  edges={edges}
  // Missing: snapToGrid={true}
  // Missing: snapGrid={[20, 20]}
  ...
>
```

### 3. AlignerNode Doesn't Use Size
**File:** `src/components/AlignerNode.tsx`

The component has no props or styles for width/height - it auto-sizes based on content padding.

## Recommendations

### Fix 1: Pass and Use Node Sizes

**App.tsx** - Pass size to node data:
```typescript
setNodes(d.nodes.map(n => ({
  id: n.id,
  type: 'aligner',
  position: n.position,
  data: {
    label: n.label,
    comments: n.comments || [],
    size: n.size,  // ADD THIS
    style: {
      backgroundColor: n.style?.fill || '#fff',
      border: `2px solid ${n.style?.stroke || '#374151'}`,
      borderRadius: n.style?.cornerRadius || 8,
    },
  },
})))
```

**AlignerNode.tsx** - Use size in rendering:
```typescript
interface AlignerNodeData {
  label: string
  comments?: Array<{ from: string; text: string }>
  size?: { width: number; height: number }  // ADD THIS
  style?: { ... }
}

// In the component:
<motion.div
  className={`aligner-node ${selected ? 'selected' : ''}`}
  style={{
    width: nodeData.size?.width,    // ADD
    height: nodeData.size?.height,  // ADD
    backgroundColor: nodeData.style?.backgroundColor || '#fff',
    ...
  }}
>
```

### Fix 2: Enable Snap-to-Grid

**App.tsx** - Add snap props to ReactFlow:
```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={handleNodesChange}
  onEdgesChange={handleEdgesChange}
  onConnect={onConnect}
  onNodeClick={onNodeClick}
  nodeTypes={nodeTypes}
  snapToGrid={true}           // ADD
  snapGrid={[20, 20]}         // ADD - match Background gap
  fitView
  deleteKeyCode="Backspace"
  proOptions={{ hideAttribution: true }}
>
```

### Fix 3: Improve Edge Routing

**App.tsx** - Use step edges for cleaner routing:
```typescript
setEdges(d.edges.map(e => ({
  id: e.id,
  source: e.from,
  target: e.to,
  label: e.label,
  type: 'smoothstep',  // ADD - cleaner than bezier
  animated: e.type === 'dashed',
  style: {
    stroke: '#6b7280',
    strokeWidth: 2,
  },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
})))
```

### Fix 4: Improve Node Styling

**styles.css** - Better text alignment and sizing:
```css
.aligner-node {
  background: #fff;
  border: 2px solid #222;
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 100px;
  color: #000;
  font-size: 13px;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;
}

.aligner-node .node-label {
  font-weight: 500;
  line-height: 1.4;
  white-space: pre-wrap;
  text-align: center;
  width: 100%;
}
```

### Fix 5: Grid-Aligned Diagram JSON

Update `dual-gateway-setup.json` to use grid-aligned coordinates (multiples of 20):

Current positions like `{ "x": 30, "y": 70 }` should become `{ "x": 40, "y": 80 }`.

## Implementation Order

1. **Phase 1**: Pass size data through (App.tsx → AlignerNode.tsx)
2. **Phase 2**: Enable snap-to-grid on ReactFlow
3. **Phase 3**: Improve edge type to smoothstep
4. **Phase 4**: Update CSS for better text centering
5. **Phase 5**: Re-align dual-gateway-setup.json positions to grid

## Verification

After implementing:
1. Open dual-gateway-setup diagram
2. Nodes should have consistent sizes from JSON
3. Dragging should snap to 20px grid
4. Edges should route with cleaner orthogonal paths
5. Text should be centered within nodes

## Related Files
- `src/App.tsx` - Main app, ReactFlow config, node transformation
- `src/components/AlignerNode.tsx` - Custom node component
- `src/styles.css` - Node styling
- `~/.aligner/global/dual-gateway-setup.json` - Test diagram
