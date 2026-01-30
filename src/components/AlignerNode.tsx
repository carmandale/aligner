import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

interface AlignerNodeData {
  label: string
  comments?: Array<{ from: string; text: string }>
  style?: {
    backgroundColor?: string
    border?: string
    borderRadius?: number
  }
}

export const AlignerNode = memo(function AlignerNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as AlignerNodeData
  const commentCount = nodeData.comments?.length || 0
  const hasComments = commentCount > 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`aligner-node ${selected ? 'selected' : ''} ${hasComments ? 'has-comments' : ''}`}
      style={{
        backgroundColor: nodeData.style?.backgroundColor || '#fff',
        border: nodeData.style?.border || '2px solid #374151',
        borderRadius: nodeData.style?.borderRadius || 8,
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
      />
      
      <div className="node-label">{nodeData.label}</div>
      
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
        className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
      />
    </motion.div>
  )
})

export const nodeTypes = {
  aligner: AlignerNode,
}
