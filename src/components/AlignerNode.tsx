import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { MessageCircle } from 'lucide-react'

interface AlignerNodeData {
  label: string
  nodeType?: string
  comments?: Array<{ from: string; text: string }>
  size?: { width: number; height: number }
  style?: {
    backgroundColor?: string
    borderRadius?: number
    stroke?: string
  }
}

// Detect section headers by pattern
const isSectionHeader = (label: string): boolean => {
  return /^[A-Z][A-Z\s\-]+(\([^)]+\))?$/.test(label.trim())
}

export const AlignerNode = memo(function AlignerNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as AlignerNodeData
  const commentCount = nodeData.comments?.length || 0
  const hasComments = commentCount > 0
  const isDiamond = nodeData.nodeType === 'diamond'
  const isSection = isSectionHeader(nodeData.label)
  
  const bgColor = nodeData.style?.backgroundColor || '#ffffff'
  const strokeColor = nodeData.style?.stroke || '#374151'

  // Section header
  if (isSection) {
    return (
      <div className="section-header" style={{ borderLeftColor: strokeColor }}>
        {nodeData.label}
      </div>
    )
  }

  // Diamond decision node - use hexagon-ish shape, NOT rotated text
  if (isDiamond) {
    return (
      <div className={`diamond-node ${selected ? 'selected' : ''}`}>
        <Handle type="target" position={Position.Top} className="handle" />
        <Handle type="target" position={Position.Left} id="left-in" className="handle" />
        
        <div 
          className="diamond-inner"
          style={{ backgroundColor: bgColor, borderColor: strokeColor }}
        >
          <span className="diamond-icon">◆</span>
          <span className="diamond-text">{nodeData.label}</span>
        </div>
        
        {hasComments && (
          <div className="comment-badge">
            <MessageCircle size={10} />{commentCount}
          </div>
        )}
        
        <Handle type="source" position={Position.Bottom} className="handle" />
        <Handle type="source" position={Position.Right} id="right" className="handle" />
        <Handle type="source" position={Position.Left} id="left" className="handle" />
      </div>
    )
  }

  // Standard node - auto-sized to content
  return (
    <div
      className={`flow-node ${selected ? 'selected' : ''} ${hasComments ? 'has-comments' : ''}`}
      style={{
        backgroundColor: bgColor,
        borderColor: strokeColor,
        borderRadius: nodeData.style?.borderRadius || 6,
      }}
    >
      <Handle type="target" position={Position.Top} className="handle" />
      <Handle type="target" position={Position.Left} id="left-in" className="handle" />
      
      <div className="node-text">{nodeData.label}</div>
      
      {hasComments && (
        <div className="comment-badge">
          <MessageCircle size={10} />{commentCount}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="handle" />
      <Handle type="source" position={Position.Right} id="right" className="handle" />
    </div>
  )
})

export const nodeTypes = {
  aligner: AlignerNode,
}
