import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  OnNodesChange,
  OnEdgesChange,
  addEdge,
  Connection,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFileSync } from './hooks/useFileSync';
import { useDiagramList } from './hooks/useDiagramList';
import { alignerToReactFlow, reactFlowToAligner } from './converter';
import { AlignerDiagram } from './types';
import './App.css';

function DiagramEditor({ filename }: { filename: string }) {
  const { diagram, saveDiagram, error, loading } = useFileSync(filename);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [initialized, setInitialized] = useState(false);

  // Load diagram into React Flow
  useEffect(() => {
    if (diagram && !initialized) {
      const { nodes: rfNodes, edges: rfEdges } = alignerToReactFlow(diagram);
      setNodes(rfNodes);
      setEdges(rfEdges);
      setInitialized(true);
    }
  }, [diagram, initialized, setNodes, setEdges]);

  // Reload when diagram changes externally
  useEffect(() => {
    if (diagram && initialized) {
      const { nodes: rfNodes, edges: rfEdges } = alignerToReactFlow(diagram);
      // Only update if significantly different (external edit)
      if (JSON.stringify(rfNodes.map(n => n.position)) !== JSON.stringify(nodes.map(n => n.position))) {
        setNodes(rfNodes);
        setEdges(rfEdges);
      }
    }
  }, [diagram]);

  // Save changes back to file
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Save after drag ends
      if (changes.some(c => c.type === 'position' && 'dragging' in c && !c.dragging)) {
        if (diagram) {
          const updatedDiagram = reactFlowToAligner(nodes, edges, diagram);
          saveDiagram(updatedDiagram);
        }
      }
    },
    [onNodesChange, nodes, edges, diagram, saveDiagram]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      if (diagram && changes.length > 0) {
        setTimeout(() => {
          const updatedDiagram = reactFlowToAligner(nodes, edges, diagram);
          saveDiagram(updatedDiagram);
        }, 100);
      }
    },
    [onEdgesChange, nodes, edges, diagram, saveDiagram]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      if (diagram) {
        setTimeout(() => {
          const updatedDiagram = reactFlowToAligner(nodes, edges, diagram);
          saveDiagram(updatedDiagram);
        }, 100);
      }
    },
    [setEdges, nodes, edges, diagram, saveDiagram]
  );

  if (loading) {
    return <div className="loading">Loading diagram...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!diagram) {
    return <div className="empty">No diagram loaded</div>;
  }

  return (
    <div className="editor">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        fitView
        snapToGrid
        snapGrid={[10, 10]}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap />
        <Panel position="top-left" className="diagram-info">
          <h3>{diagram.name}</h3>
          {diagram.metadata?.description && (
            <p>{diagram.metadata.description}</p>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}

function App() {
  const { diagrams, loading, error } = useDiagramList();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Auto-select first diagram
  useEffect(() => {
    if (!selectedFile && diagrams.length > 0) {
      setSelectedFile(diagrams[0].filename);
    }
  }, [diagrams, selectedFile]);

  return (
    <div className="app">
      <header className="header">
        <h1>⚡ Aligner</h1>
        <span className="tagline">Visual feedback loop for AI agents</span>
      </header>

      <div className="main">
        <aside className="sidebar">
          <h2>Diagrams</h2>
          {loading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          {diagrams.length === 0 && !loading && (
            <p className="hint">
              No diagrams yet.<br />
              Add .json files to<br />
              <code>~/.aligner/</code>
            </p>
          )}
          <ul className="diagram-list">
            {diagrams.map((d) => (
              <li
                key={d.filename}
                className={selectedFile === d.filename ? 'selected' : ''}
                onClick={() => setSelectedFile(d.filename)}
              >
                <span className="name">{d.name}</span>
                <span className="filename">{d.filename}</span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="canvas">
          {selectedFile ? (
            <DiagramEditor key={selectedFile} filename={selectedFile} />
          ) : (
            <div className="empty">
              <p>Select a diagram or create one</p>
              <code>~/.aligner/my-diagram.json</code>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
