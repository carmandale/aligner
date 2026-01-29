// Convert between Aligner JSON and React Flow format

import { Node, Edge, MarkerType } from '@xyflow/react';
import { AlignerDiagram, AlignerNode, AlignerEdge } from './types';

export function alignerToReactFlow(diagram: AlignerDiagram): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = diagram.nodes.map((node: AlignerNode) => ({
    id: node.id,
    type: mapNodeType(node.type),
    position: node.position,
    data: {
      label: node.label,
      icon: node.icon,
      originalType: node.type,
      ...node.data,
    },
    style: {
      backgroundColor: node.style?.fill || '#ffffff',
      borderColor: node.style?.stroke || '#1a192b',
      borderWidth: node.style?.strokeWidth || 1,
      borderRadius: node.type === 'circle' ? '50%' : (node.style?.cornerRadius || 4),
      fontSize: node.style?.fontSize || 12,
      color: node.style?.fontColor || '#222',
      width: node.size?.width || 150,
      height: node.size?.height || 40,
      boxShadow: node.style?.shadow ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
    },
  }));

  const edges: Edge[] = diagram.edges.map((edge: AlignerEdge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: mapEdgeType(edge.type),
    animated: edge.style?.animated || edge.type === 'dashed',
    style: {
      stroke: edge.style?.stroke || '#b1b1b7',
      strokeWidth: edge.style?.strokeWidth || 1,
      strokeDasharray: edge.type === 'dashed' ? '5,5' : undefined,
    },
    markerEnd: edge.type !== 'line' ? { type: MarkerType.ArrowClosed } : undefined,
  }));

  return { nodes, edges };
}

export function reactFlowToAligner(
  nodes: Node[],
  edges: Edge[],
  existingDiagram: AlignerDiagram
): AlignerDiagram {
  const alignerNodes: AlignerNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.data?.originalType || 'rect',
    label: typeof node.data?.label === 'string' ? node.data.label : '',
    position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
    size: node.style ? {
      width: typeof node.style.width === 'number' ? node.style.width : 150,
      height: typeof node.style.height === 'number' ? node.style.height : 40,
    } : undefined,
    style: node.style ? {
      fill: typeof node.style.backgroundColor === 'string' ? node.style.backgroundColor : undefined,
      stroke: typeof node.style.borderColor === 'string' ? node.style.borderColor : undefined,
      cornerRadius: typeof node.style.borderRadius === 'number' ? node.style.borderRadius : undefined,
    } : undefined,
    icon: node.data?.icon,
  }));

  const alignerEdges: AlignerEdge[] = edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    type: edge.animated ? 'dashed' : 'arrow',
    label: typeof edge.label === 'string' ? edge.label : undefined,
  }));

  return {
    ...existingDiagram,
    nodes: alignerNodes,
    edges: alignerEdges,
    metadata: {
      ...existingDiagram.metadata,
      modified: new Date().toISOString(),
    },
  };
}

function mapNodeType(type: string): string {
  switch (type) {
    case 'diamond':
      return 'default'; // Could create custom node
    case 'circle':
      return 'default';
    default:
      return 'default';
  }
}

function mapEdgeType(type?: string): string {
  switch (type) {
    case 'orthogonal':
      return 'smoothstep';
    case 'curved':
      return 'bezier';
    default:
      return 'default';
  }
}
