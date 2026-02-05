import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

interface AlignerNodeData {
  label: string
  nodeType?: string // 'rect' | 'diamond' | 'section'
  comments?: Array<{ from: string; text: string }>
  size?: { width: number; height: number }
  style?: {
    backgroundColor?: string
    border?: string
    borderRadius?: number
    textColor?: string
    stroke?: string
  }
}

// Detect if this is a section header based on label patterns
const isSectionHeader = (label: string): boolean => {
  const sectionPatterns = [
    /^[A-Z\s]+\(.*\)$/,  // "MEDIA SERVER (Producer)"
    /^[A-Z\s]{6,}$/,     // All caps, 6+ chars
  ]
  return sectionPatterns.some(p => p.test(label.trim()))
}

// Detect if this is a diamond/decision node
const isDecisionNode = (label: string, nodeType?: string): boolean => {
  if (nodeType === 'diamond') return true
  const decisionPatterns = [/\?$/, /^(If|When|Check|Resolve|Decision)/i]
  return decisionPatterns.some(p => p.test(label.trim()))
}

export const AlignerNode = memo(function AlignerNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as AlignerNodeData
  const commentCount = nodeData.comments?.length || 0
  const hasComments = commentCount > 0
  
  const isSection = isSectionHeader(nodeData.label)
  const isDiamond = isDecisionNode(nodeData.label, nodeData.nodeType)
  
  // Section header styling
  if (isSection) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="aligner-section-header"
        style={{
          width: nodeData.size?.width,
          minWidth: 200,
        }}
      >
        <div className="section-label">{nodeData.label}</div>
      </motion.div>
    )
  }
  
  // Diamond/decision node styling
  if (isDiamond) {
    const size = Math.max(nodeData.size?.width || 120, nodeData.size?.height || 80)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`aligner-diamond ${selected ? 'selected' : ''} ${hasComments ? 'has-comments' : ''}`}
        style={{
          width: size,
          height: size,
        }}
      >
        <Handle 
          type="target" 
          position={Position.Top}
          className="!bg-amber-500 !w-3 !h-3 !border-2 !border-amber-200"
          style={{ top: -6 }}
        />
        
        <div 
          className="diamond-shape"
          style={{
            backgroundColor: nodeData.style?.backgroundColor || '#fef3c7',
            borderColor: nodeData.style?.stroke || '#f59e0b',
          }}
        >
          <div className="diamond-content">
            <span className="diamond-icon">?</span>
            <div className="diamond-label">
              {nodeData.label.split('\n').map((line, i) => (
                <span key={i} style={{ display: 'block' }}>{line}</span>
              ))}
            </div>
          </div>
        </div>
        
        {hasComments && (
          <motion.div 
            className="comment-count diamond-comment"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <MessageCircle size={10} />
            {commentCount}
          </motion.div>
        )}
        
        <Handle 
          type="source" 
          position={Position.Bottom}
          className="!bg-amber-500 !w-3 !h-3 !border-2 !border-amber-200"
          style={{ bottom: -6 }}
        />
        <Handle 
          type="source" 
          position={Position.Left}
          id="left"
          className="!bg-amber-500 !w-3 !h-3 !border-2 !border-amber-200"
          style={{ left: -6 }}
        />
        <Handle 
          type="source" 
          position={Position.Right}
          id="right"
          className="!bg-amber-500 !w-3 !h-3 !border-2 !border-amber-200"
          style={{ right: -6 }}
        />
      </motion.div>
    )
  }

  // Standard node - enhanced styling
  const strokeColor = nodeData.style?.stroke || '#374151'
  const bgColor = nodeData.style?.backgroundColor || '#fff'
  
  // Determine node category for styling hints
  const isDataNode = bgColor.includes('dcf') || bgColor.includes('22c') // green tones
  const isProcessNode = bgColor.includes('dbe') || bgColor.includes('3b8') // blue tones
  const isExternalNode = bgColor.includes('e0e') || bgColor.includes('636') // purple tones
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`aligner-node ${selected ? 'selected' : ''} ${hasComments ? 'has-comments' : ''}`}
      style={{
        width: nodeData.size?.width,
        height: nodeData.size?.height,
        backgroundColor: bgColor,
        borderColor: strokeColor,
        borderRadius: nodeData.style?.borderRadius || 8,
        color: nodeData.style?.textColor || '#1f2937',
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="node-handle"
        style={{ 
          backgroundColor: strokeColor,
          borderColor: bgColor,
        }}
      />
      
      {/* Category indicator line */}
      <div 
        className="node-category-bar"
        style={{ backgroundColor: strokeColor }}
      />
      
      <div className="node-content">
        {/* Icon based on node type */}
        {isProcessNode && <span className="node-type-icon">⚙</span>}
        {isDataNode && <span className="node-type-icon">📦</span>}
        {isExternalNode && <span className="node-type-icon">🔗</span>}
        
        <div className="node-label">
          {nodeData.label.split('\n').map((line, i) => {
            // Check if line looks like code (has () or is a path)
            const isCode = /[\(\)\/]/.test(line) || line.startsWith('/') || line.includes('.')
            return (
              <span 
                key={i} 
                className={isCode ? 'code-line' : 'text-line'}
                style={{ display: 'block' }}
              >
                {line}
              </span>
            )
          })}
        </div>
      </div>
      
      {hasComments && (
        <motion.div 
          className="comment-count"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
        >
          <MessageCircle size={10} style={{ marginRight: 2 }} />
          {commentCount}
        </motion.div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="node-handle"
        style={{ 
          backgroundColor: strokeColor,
          borderColor: bgColor,
        }}
      />
    </motion.div>
  )
})

export const nodeTypes = {
  aligner: AlignerNode,
}
