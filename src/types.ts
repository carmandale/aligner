// Aligner JSON Schema - compatible with Flowy format

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  fontSize?: number;
  fontColor?: string;
  shadow?: boolean;
}

export interface NodeIcon {
  name: string;
  size?: number;
  color?: string;
}

export interface AlignerNode {
  id: string;
  type: 'rect' | 'circle' | 'diamond' | 'text' | 'group';
  label: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  style?: NodeStyle;
  icon?: NodeIcon;
  data?: Record<string, unknown>;
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  animated?: boolean;
}

export interface AlignerEdge {
  id: string;
  from: string;
  to: string;
  type?: 'arrow' | 'dashed' | 'line' | 'orthogonal' | 'curved';
  label?: string;
  style?: EdgeStyle;
}

export interface AlignerDiagram {
  version: string;
  name: string;
  type?: 'flowchart' | 'mockup';
  nodes: AlignerNode[];
  edges: AlignerEdge[];
  metadata?: {
    description?: string;
    created?: string;
    modified?: string;
  };
}
