import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

interface Comment {
  from: 'user' | 'agent';
  text: string;
}

interface AlignerNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  style?: { fill?: string; stroke?: string; cornerRadius?: number };
  comments?: Comment[];
}

interface AlignerEdge {
  id: string;
  from: string;
  to: string;
  type?: string;
  label?: string;
}

interface AlignerDiagram {
  version: string;
  name: string;
  nodes: AlignerNode[];
  edges: AlignerEdge[];
  metadata?: { description?: string };
}

const API = 'http://localhost:3001';

function App() {
  const [diagrams, setDiagrams] = useState<{ filename: string; name: string }[]>([]);
  const [file, setFile] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<AlignerDiagram | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [showAddNode, setShowAddNode] = useState(false);

  // Load list
  useEffect(() => {
    fetch(`${API}/diagrams`).then(r => r.json()).then(d => {
      setDiagrams(d);
      if (d.length && !file) setFile(d[0].filename);
    });
  }, []);

  // Load diagram
  useEffect(() => {
    if (!file) return;
    fetch(`${API}/diagram/${file}`).then(r => r.json()).then((d: AlignerDiagram) => {
      setDiagram(d);
      setNodes(d.nodes.map(n => ({
        id: n.id,
        position: n.position,
        data: { label: n.label, comments: n.comments || [] },
        style: {
          backgroundColor: n.style?.fill || '#fff',
          border: `2px solid ${n.style?.stroke || '#222'}`,
          borderRadius: n.style?.cornerRadius || 4,
          padding: '10px 15px',
          color: '#000',
          width: n.size?.width,
          height: n.size?.height,
        },
        className: n.comments?.length ? 'has-comments' : '',
      })));
      setEdges(d.edges.map(e => ({
        id: e.id,
        source: e.from,
        target: e.to,
        label: e.label,
        animated: e.type === 'dashed',
        markerEnd: { type: MarkerType.ArrowClosed },
      })));
    });
  }, [file, setNodes, setEdges]);

  // Save to server
  const saveDiagram = useCallback((updated: AlignerDiagram) => {
    if (!file) return;
    setDiagram(updated);
    fetch(`${API}/diagram/${file}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  }, [file]);

  // Save positions on drag
  const handleNodesChange: OnNodesChange<Node> = useCallback((changes) => {
    onNodesChange(changes);
    const dragEnd = changes.find(c => c.type === 'position' && 'dragging' in c && !c.dragging);
    if (dragEnd && diagram) {
      const updated = { ...diagram, nodes: diagram.nodes.map(n => {
        const rn = nodes.find(x => x.id === n.id);
        return rn ? { ...n, position: { x: Math.round(rn.position.x), y: Math.round(rn.position.y) } } : n;
      })};
      saveDiagram(updated);
    }
  }, [onNodesChange, diagram, nodes, saveDiagram]);

  // Save edges on change
  const handleEdgesChange: OnEdgesChange<Edge> = useCallback((changes) => {
    onEdgesChange(changes);
    // Handle edge removal
    const removed = changes.filter(c => c.type === 'remove');
    if (removed.length && diagram) {
      const removedIds = removed.map(r => r.id);
      const updated = { ...diagram, edges: diagram.edges.filter(e => !removedIds.includes(e.id)) };
      saveDiagram(updated);
    }
  }, [onEdgesChange, diagram, saveDiagram]);

  // Handle new connections
  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return;
    const newEdge: Edge = {
      id: `e-${Date.now()}`,
      source: conn.source,
      target: conn.target,
      markerEnd: { type: MarkerType.ArrowClosed },
    };
    setEdges(eds => addEdge(newEdge, eds));
    if (diagram) {
      const updated = { ...diagram, edges: [...diagram.edges, { id: newEdge.id, from: conn.source!, to: conn.target!, type: 'arrow' }] };
      saveDiagram(updated);
    }
  }, [setEdges, diagram, saveDiagram]);

  // Select node
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelected(node.id);
    setNewComment('');
  }, []);

  // Add comment
  const addComment = () => {
    if (!diagram || !file || !selected || !newComment.trim()) return;
    const updated = { ...diagram, nodes: diagram.nodes.map(n => 
      n.id === selected ? { ...n, comments: [...(n.comments || []), { from: 'user' as const, text: newComment }] } : n
    )};
    saveDiagram(updated);
    setNodes(ns => ns.map(n => n.id === selected ? { 
      ...n, 
      data: { ...n.data, comments: [...(n.data.comments || []), { from: 'user', text: newComment }] },
      className: 'has-comments',
    } : n));
    setNewComment('');
  };

  // Add node
  const addNode = () => {
    if (!diagram || !newNodeLabel.trim()) return;
    const id = `node-${Date.now()}`;
    const newNode: AlignerNode = {
      id,
      type: 'rect',
      label: newNodeLabel,
      position: { x: 100, y: 100 },
      size: { width: 150, height: 50 },
      style: { fill: '#f3f4f6', stroke: '#6b7280', cornerRadius: 6 },
    };
    const updated = { ...diagram, nodes: [...diagram.nodes, newNode] };
    saveDiagram(updated);
    setNodes(ns => [...ns, {
      id,
      position: { x: 100, y: 100 },
      data: { label: newNodeLabel, comments: [] },
      style: {
        backgroundColor: '#f3f4f6',
        border: '2px solid #6b7280',
        borderRadius: 6,
        padding: '10px 15px',
        color: '#000',
        width: 150,
        height: 50,
      },
    }]);
    setNewNodeLabel('');
    setShowAddNode(false);
  };

  const selectedNode = diagram?.nodes.find(n => n.id === selected);
  const allComments = diagram?.nodes.filter(n => n.comments?.length) || [];

  return (
    <div className="app">
      <header className="header">
        <h1>⚡ Aligner</h1>
        <span className="tagline">Visual feedback loop for AI agents</span>
      </header>
      <div className="main">
        <aside className="sidebar">
          <h2>Diagrams</h2>
          <ul className="diagram-list">
            {diagrams.map(d => (
              <li key={d.filename} className={file === d.filename ? 'selected' : ''} onClick={() => setFile(d.filename)}>
                <span className="name">{d.name}</span>
                <span className="filename">{d.filename}</span>
              </li>
            ))}
          </ul>

          <button className="add-node-btn" onClick={() => setShowAddNode(!showAddNode)}>
            + Add Node
          </button>
          {showAddNode && (
            <div className="add-node-form">
              <input 
                value={newNodeLabel} 
                onChange={e => setNewNodeLabel(e.target.value)}
                placeholder="Node label..."
                onKeyDown={e => e.key === 'Enter' && addNode()}
              />
              <button onClick={addNode}>Add</button>
            </div>
          )}

          {selectedNode && (
            <div className="comment-panel">
              <h2>💬 {selectedNode.label}</h2>
              <div className="thread">
                {(selectedNode.comments || []).map((c, i) => (
                  <div key={i} className={`msg ${c.from}`}>
                    <span className="author">{c.from === 'user' ? 'You' : 'Agent'}</span>
                    <p>{c.text}</p>
                  </div>
                ))}
              </div>
              <textarea 
                value={newComment} 
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add comment..."
                rows={2}
              />
              <button onClick={addComment}>Send</button>
            </div>
          )}

          {allComments.length > 0 && (
            <div className="comments-section">
              <h2>All Threads</h2>
              {allComments.map(n => (
                <div key={n.id} className="comment-item" onClick={() => setSelected(n.id)}>
                  <strong>💬 {n.label}</strong>
                  <p>{n.comments?.[n.comments.length - 1]?.text}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
        <main className="canvas">
          {diagram && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              fitView
              deleteKeyCode="Backspace"
            >
              <Background gap={20} />
              <Controls />
              <MiniMap />
              <Panel position="top-left" className="diagram-info">
                <h3>{diagram.name}</h3>
                <p className="hint">Drag between nodes to connect • Backspace to delete</p>
              </Panel>
            </ReactFlow>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
