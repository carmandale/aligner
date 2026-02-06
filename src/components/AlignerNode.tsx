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

export const AlignerNode = memo(function AlignerNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as AlignerNodeData
  const commentCount = nodeData.comments?.length || 0
  const hasComments = commentCount > 0
  const nodeType = nodeData.nodeType || 'rect'
  
  const bgColor = nodeData.style?.backgroundColor || '#ffffff'
  const strokeColor = nodeData.style?.stroke || '#374151'
  const size = nodeData.size

  // SWIMLANE/CONTAINER - large background rectangle
  if (nodeType === 'container' || nodeType === 'group') {
    return (
      <div 
        className="swimlane"
        style={{
          width: size?.width || 400,
          height: size?.height || 300,
          backgroundColor: bgColor,
          borderColor: strokeColor,
        }}
      >
        <div className="swimlane-label" style={{ color: strokeColor }}>
          {nodeData.label}
        </div>
      </div>
    )
  }

  // DIAMOND - decision node with actual diamond shape
  if (nodeType === 'diamond') {
    return (
      <div className={`diamond-node ${selected ? 'selected' : ''}`}>
        <Handle type="target" position={Position.Top} className="handle" />
        <Handle type="target" position={Position.Left} id="left-in" className="handle" />
        
        <div 
          className="diamond-shape"
          style={{ backgroundColor: bgColor, borderColor: strokeColor }}
        />
        <div className="diamond-text">{nodeData.label}</div>
        
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

  // STANDARD NODE - rectangle with content
  return (
    <div
      className={`flow-node ${selected ? 'selected' : ''} ${hasComments ? 'has-comments' : ''}`}
      style={{
        backgroundColor: bgColor,
        borderColor: strokeColor,
        borderRadius: nodeData.style?.borderRadius || 4,
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
