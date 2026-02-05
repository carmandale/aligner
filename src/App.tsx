import { useCallback, useEffect, useRef, useState } from 'react'
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
} from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  MessageCircle,
  Send,
  Workflow,
  Sparkles,
  Folder,
  ChevronDown,
  ChevronRight,
  Link,
  Check,
} from 'lucide-react'
import '@xyflow/react/dist/style.css'
import './styles.css'
import { nodeTypes } from './components/AlignerNode'
import { ALIGNER_API_URL, ALIGNER_WS_URL } from './config'
import { CreateDiagramModal } from './components/CreateDiagramModal'

interface Comment {
  from: 'user' | 'agent'
  text: string
}

interface AlignerNode {
  id: string
  type: string
  label: string
  position: { x: number; y: number }
  size?: { width: number; height: number }
  style?: { fill?: string; stroke?: string; cornerRadius?: number; textColor?: string }
  comments?: Comment[]
}

interface AlignerEdge {
  id: string
  from: string
  to: string
  type?: string
  label?: string
}

interface AlignerDiagram {
  version: string
  name: string
  nodes: AlignerNode[]
  edges: AlignerEdge[]
  metadata?: { description?: string }
}

const API = ALIGNER_API_URL

interface DiagramListItem {
  filename: string
  name: string
  repo: string
  repoPath: string
  modified?: string
}

interface RepoInfo {
  path: string
  name: string
  status: 'ok' | 'missing'
}

interface RepoGroup extends RepoInfo {
  diagrams: DiagramListItem[]
}

const encodeRepoPath = (repoPath: string) =>
  repoPath === 'global' ? 'global' : encodeURIComponent(repoPath)

const diagramKey = (diagram: DiagramListItem) =>
  `${diagram.repoPath}::${diagram.filename}`

// URL parameter helpers for shareable chart links
const getChartFromURL = (): string | null => {
  const params = new URLSearchParams(window.location.search)
  return params.get('chart')
}

const updateURLWithChart = (chartKey: string | null) => {
  const url = new URL(window.location.href)
  if (chartKey) {
    url.searchParams.set('chart', chartKey)
  } else {
    url.searchParams.delete('chart')
  }
  window.history.replaceState({}, '', url.toString())
}

function App() {
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(getChartFromURL)
  const [repos, setRepos] = useState<RepoInfo[]>([])
  const [diagram, setDiagram] = useState<AlignerDiagram | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [showAddNode, setShowAddNode] = useState(false)
  const [filter, setFilter] = useState('')
  const [collapsedRepos, setCollapsedRepos] = useState<{ [repoPath: string]: boolean }>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const selectedDiagramRef = useRef<DiagramListItem | null>(null)

  const selectedDiagram = diagrams.find(d => diagramKey(d) === selectedKey) || null
  const selectedRepoPath = selectedDiagram?.repoPath || 'global'

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }, [])

  const applyDiagramData = useCallback((d: AlignerDiagram) => {
    setDiagram(d)
    setNodes(d.nodes.map(n => ({
      id: n.id,
      type: 'aligner',
      position: n.position,
      data: {
        label: n.label,
        comments: n.comments || [],
        size: n.size,
        style: {
          backgroundColor: n.style?.fill || '#fff',
          border: `2px solid ${n.style?.stroke || '#374151'}`,
          borderRadius: n.style?.cornerRadius || 8,
          textColor: n.style?.textColor,
        },
      },
    })))
    setEdges(d.edges.map(e => ({
      id: e.id,
      source: e.from,
      target: e.to,
      label: e.label,
      type: 'smoothstep',
      animated: e.type === 'dashed',
      style: {
        stroke: '#6b7280',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: '#9ca3af',
        fontSize: 11,
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: 'rgba(10, 10, 15, 0.8)',
        fillOpacity: 0.8,
      },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    })))
  }, [setNodes, setEdges])

  const fetchDiagram = useCallback((diagramInfo: DiagramListItem) => {
    const repoParam = encodeRepoPath(diagramInfo.repoPath)
    fetch(`${API}/diagram/${repoParam}/${diagramInfo.filename}`)
      .then(r => r.json())
      .then((d: AlignerDiagram) => {
        applyDiagramData(d)
      })
      .catch(() => {})
  }, [applyDiagramData])

  const loadDiagrams = useCallback(() => {
    fetch(`${API}/diagrams`)
      .then(r => r.json())
      .then((d: DiagramListItem[]) => {
        setDiagrams(d)
        setSelectedKey(prev => {
          // If we already have a valid selection, keep it
          if (prev && d.some(diagram => diagramKey(diagram) === prev)) {
            return prev
          }
          // Check URL for a chart param (handles initial load from shared link)
          const urlChart = getChartFromURL()
          if (urlChart && d.some(diagram => diagramKey(diagram) === urlChart)) {
            return urlChart
          }
          // Default to first diagram
          return d.length ? diagramKey(d[0]) : null
        })
        if (d.length === 0) {
          setDiagram(null)
          setNodes([])
          setEdges([])
        }
      })
      .catch(() => {})
  }, [setDiagram, setEdges, setNodes])

  const loadRepos = useCallback(() => {
    fetch(`${API}/repos`)
      .then(r => r.json())
      .then(data => {
        const okRepos = (data.repos || []).map((repo: RepoInfo) => ({
          ...repo,
          status: 'ok',
        }))
        const missingRepos = (data.missing || []).map((repo: RepoInfo) => ({
          ...repo,
          status: 'missing',
        }))
        setRepos([...okRepos, ...missingRepos])
      })
      .catch(() => {
        setRepos([])
      })
  }, [])

  useEffect(() => {
    loadDiagrams()
    loadRepos()
  }, [loadDiagrams, loadRepos])

  useEffect(() => {
    selectedDiagramRef.current = selectedDiagram
  }, [selectedDiagram])

  // Update URL when selection changes (for shareable links)
  useEffect(() => {
    updateURLWithChart(selectedKey)
  }, [selectedKey])

  useEffect(() => {
    if (!selectedDiagram) return
    fetchDiagram(selectedDiagram)
  }, [selectedDiagram, fetchDiagram])

  useEffect(() => {
    setCollapsedRepos(prev => {
      const next = { ...prev }
      for (const repo of repos) {
        if (next[repo.path] === undefined) {
          next[repo.path] = true
        }
      }
      if (next['global'] === undefined) {
        next['global'] = false
      }
      return next
    })
  }, [repos])

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let didUnmount = false

    const connect = () => {
      ws = new WebSocket(ALIGNER_WS_URL)

      ws.onopen = () => {
        console.log('🔌 Connected to server')
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        console.log('📨 Received:', msg)

        if (msg.type.startsWith('diagram.')) {
          // Refresh diagram list on any diagram change
          loadDiagrams()

          const current = selectedDiagramRef.current
          if (current && msg.filename === current.filename) {
            const repoName = current.repoPath === 'global'
              ? 'global'
              : current.repoPath.split('/').pop()
            const msgRepo = typeof msg.repo === 'string' ? msg.repo.toLowerCase() : ''
            const currentRepoLabel = current.repo ? current.repo.toLowerCase() : ''

            if (
              (repoName && msgRepo === repoName.toLowerCase()) ||
              (currentRepoLabel && msgRepo === currentRepoLabel)
            ) {
              fetchDiagram(current)
            }
          }
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        if (didUnmount) return
        console.log('🔌 Disconnected from server')
        reconnectTimer = window.setTimeout(() => {
          console.log('🔄 Reconnecting...')
          connect()
        }, 3000)
      }
    }

    connect()

    return () => {
      didUnmount = true
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
      }
      if (ws) {
        ws.close()
      }
    }
  }, [fetchDiagram, loadDiagrams])

  // Save to server
  const saveDiagram = useCallback((updated: AlignerDiagram) => {
    if (!selectedDiagram) return
    setDiagram(updated)
    const repoParam = encodeRepoPath(selectedDiagram.repoPath)
    fetch(`${API}/diagram/${repoParam}/${selectedDiagram.filename}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }, [selectedDiagram])

  // Save positions on drag
  const handleNodesChange: OnNodesChange<Node> = useCallback((changes) => {
    onNodesChange(changes)
    const dragEnd = changes.find(c => c.type === 'position' && 'dragging' in c && !c.dragging)
    if (dragEnd && diagram) {
      const updated = { ...diagram, nodes: diagram.nodes.map(n => {
        const rn = nodes.find(x => x.id === n.id)
        return rn ? { ...n, position: { x: Math.round(rn.position.x), y: Math.round(rn.position.y) } } : n
      })}
      saveDiagram(updated)
    }
  }, [onNodesChange, diagram, nodes, saveDiagram])

  // Save edges on change
  const handleEdgesChange: OnEdgesChange<Edge> = useCallback((changes) => {
    onEdgesChange(changes)
    const removed = changes.filter(c => c.type === 'remove')
    if (removed.length && diagram) {
      const removedIds = removed.map(r => r.id)
      const updated = { ...diagram, edges: diagram.edges.filter(e => !removedIds.includes(e.id)) }
      saveDiagram(updated)
    }
  }, [onEdgesChange, diagram, saveDiagram])

  // Handle new connections
  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return
    const newEdge: Edge = {
      id: `e-${Date.now()}`,
      source: conn.source,
      target: conn.target,
      style: { stroke: '#6b7280', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    }
    setEdges(eds => addEdge(newEdge, eds))
    if (diagram) {
      const updated = { ...diagram, edges: [...diagram.edges, { id: newEdge.id, from: conn.source!, to: conn.target!, type: 'arrow' }] }
      saveDiagram(updated)
    }
  }, [setEdges, diagram, saveDiagram])

  // Select node
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelected(node.id)
    setNewComment('')
  }, [])

  // Add comment
  const addComment = () => {
    if (!diagram || !selected || !newComment.trim()) return
    const updated = { ...diagram, nodes: diagram.nodes.map(n => 
      n.id === selected ? { ...n, comments: [...(n.comments || []), { from: 'user' as const, text: newComment }] } : n
    )}
    saveDiagram(updated)
    setNodes(ns => ns.map(n => n.id === selected ? { 
      ...n, 
      data: { ...n.data, comments: [...((n.data as any).comments || []), { from: 'user', text: newComment }] },
    } : n))
    setNewComment('')
  }

  // Add node
  const addNode = () => {
    if (!diagram || !newNodeLabel.trim()) return
    const id = `node-${Date.now()}`
    const newNode: AlignerNode = {
      id,
      type: 'rect',
      label: newNodeLabel,
      position: { x: 100, y: 100 },
      size: { width: 150, height: 50 },
      style: { fill: '#f3f4f6', stroke: '#6b7280', cornerRadius: 8 },
    }
    const updated = { ...diagram, nodes: [...diagram.nodes, newNode] }
    saveDiagram(updated)
    setNodes(ns => [...ns, {
      id,
      type: 'aligner',
      position: { x: 100, y: 100 },
      data: {
        label: newNodeLabel,
        comments: [],
        style: {
          backgroundColor: '#f3f4f6',
          border: '2px solid #6b7280',
          borderRadius: 8,
        },
      },
    }])
    setNewNodeLabel('')
    setShowAddNode(false)
  }

  const selectedNode = diagram?.nodes.find(n => n.id === selected)
  const allComments = diagram?.nodes.filter(n => n.comments?.length) || []
  const filterValue = filter.trim().toLowerCase()

  const diagramsByRepo = diagrams.reduce((acc, d) => {
    if (!acc[d.repoPath]) {
      acc[d.repoPath] = []
    }
    acc[d.repoPath].push(d)
    return acc
  }, {} as Record<string, DiagramListItem[]>)

  const repoIndex = new Map(repos.map(repo => [repo.path, repo]))
  const repoGroups: RepoGroup[] = repos.map(repo => ({
    ...repo,
    diagrams: diagramsByRepo[repo.path] || [],
  }))

  for (const [repoPath, repoDiagrams] of Object.entries(diagramsByRepo)) {
    if (repoPath === 'global') continue
    if (repoIndex.has(repoPath)) continue
    repoGroups.push({
      path: repoPath,
      name: repoDiagrams[0]?.repo || repoPath.split('/').pop() || repoPath,
      status: 'missing',
      diagrams: repoDiagrams,
    })
  }

  const globalGroup: RepoGroup = {
    path: 'global',
    name: 'Global',
    status: 'ok',
    diagrams: diagramsByRepo['global'] || [],
  }

  const orderedGroups = [
    ...repoGroups.filter(repo => repo.path !== 'global' && repo.status === 'ok')
      .sort((a, b) => a.name.localeCompare(b.name)),
    ...repoGroups.filter(repo => repo.path !== 'global' && repo.status === 'missing')
      .sort((a, b) => a.name.localeCompare(b.name)),
    globalGroup,
  ]

  const toggleRepoCollapse = (repoPath: string) => {
    setCollapsedRepos(prev => ({ ...prev, [repoPath]: !prev[repoPath] }))
  }

  const handleRemoveRepo = useCallback(async (repo: RepoGroup) => {
    if (!window.confirm(`Remove "${repo.name}" from the registry?`)) return
    try {
      await fetch(`${API}/repos/${encodeURIComponent(repo.path)}`, { method: 'DELETE' })
      loadRepos()
      loadDiagrams()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to remove repository')
    }
  }, [loadDiagrams, loadRepos])

  const handleLocateRepo = useCallback(async (repo: RepoGroup) => {
    const newPath = window.prompt(`Enter the new path for "${repo.name}"`, repo.path)
    if (!newPath) return

    try {
      const response = await fetch(`${API}/repos/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, name: repo.name }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to register repository')
      }

      await fetch(`${API}/repos/${encodeURIComponent(repo.path)}`, { method: 'DELETE' })
      loadRepos()
      loadDiagrams()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to update repository')
    }
  }, [loadDiagrams, loadRepos])

  return (
    <div className="app">
      <header className="header">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Workflow className="text-blue-500" size={24} />
          <h1>Aligner</h1>
        </motion.div>
        <span className="tagline">Visual feedback loop for AI agents</span>
      </header>

      <div className="main">
        <aside className="sidebar">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2>Diagrams</h2>
              <motion.button
                className="new-diagram-btn"
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
              >
                <Plus size={14} />
                New
              </motion.button>
            </div>
            <div className="filter-box">
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter diagrams or repos..."
              />
            </div>
            <div className="repo-groups">
              {orderedGroups.map(group => {
                const repoMatches = filterValue.length > 0
                  ? group.name.toLowerCase().includes(filterValue)
                  : false
                const diagramMatches = filterValue.length > 0
                  ? group.diagrams.filter(d => (
                    d.name.toLowerCase().includes(filterValue) ||
                    d.filename.toLowerCase().includes(filterValue)
                  ))
                  : group.diagrams
                const diagramsToShow = filterValue.length > 0 && !repoMatches
                  ? diagramMatches
                  : group.diagrams
                const shouldShow = filterValue.length > 0
                  ? (repoMatches || diagramMatches.length > 0)
                  : (group.diagrams.length > 0 || group.status === 'missing' || group.path === 'global')

                if (!shouldShow) return null

                const isCollapsed = filterValue.length > 0
                  ? false
                  : (collapsedRepos[group.path] ?? (group.path !== 'global'))
                const diagramCount = filterValue.length > 0 && !repoMatches
                  ? diagramMatches.length
                  : group.diagrams.length

                return (
                  <div key={group.path} className="repo-group">
                    <motion.div
                      className={`repo-header ${group.status === 'missing' ? 'missing' : ''}`}
                      onClick={() => toggleRepoCollapse(group.path)}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Folder size={14} className="repo-icon" />
                      <span className="repo-name">{group.name}</span>
                      {group.status === 'missing' && (
                        <span className="repo-status">Missing</span>
                      )}
                      <span className="diagram-count">({diagramCount})</span>
                      {isCollapsed ? (
                        <ChevronRight size={14} className="chevron" />
                      ) : (
                        <ChevronDown size={14} className="chevron" />
                      )}
                    </motion.div>

                    {group.status === 'missing' && (
                      <div className="repo-missing-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleLocateRepo(group)}
                        >
                          Locate
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleRemoveRepo(group)}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {!isCollapsed && diagramsToShow.length > 0 && (
                        <motion.ul
                          className="diagram-list"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {diagramsToShow.map(d => (
                            <motion.li
                              key={diagramKey(d)}
                              className={diagramKey(d) === selectedKey ? 'selected' : ''}
                              onClick={() => setSelectedKey(diagramKey(d))}
                              whileHover={{ x: 2 }}
                              whileTap={{ scale: 0.98 }}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                            >
                              <span className="name">{d.name}</span>
                              <span className="filename">{d.filename}</span>
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <motion.button 
              className="add-node-btn" 
              onClick={() => setShowAddNode(!showAddNode)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
              Add Node
            </motion.button>
            <AnimatePresence>
              {showAddNode && (
                <motion.div 
                  className="add-node-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <input 
                    value={newNodeLabel} 
                    onChange={e => setNewNodeLabel(e.target.value)}
                    placeholder="Node label..."
                    onKeyDown={e => e.key === 'Enter' && addNode()}
                    autoFocus
                  />
                  <button onClick={addNode}>Add</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {selectedNode && (
              <motion.div 
                className="comment-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h2>
                  <MessageCircle size={14} />
                  {selectedNode.label}
                </h2>
                <div className="thread">
                  <AnimatePresence>
                    {(selectedNode.comments || []).map((c, i) => (
                      <motion.div 
                        key={i} 
                        className={`msg ${c.from}`}
                        initial={{ opacity: 0, x: c.from === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <span className="author">{c.from === 'user' ? 'You' : 'Agent'}</span>
                        <p>{c.text}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <textarea 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add comment..."
                  rows={2}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      addComment()
                    }
                  }}
                />
                <motion.button 
                  onClick={addComment}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Send size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Send
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {allComments.length > 0 && (
            <div className="comments-section">
              <h2>
                <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                Active Threads
              </h2>
              {allComments.map(n => (
                <motion.div 
                  key={n.id} 
                  className="comment-item" 
                  onClick={() => setSelected(n.id)}
                  whileHover={{ x: 2 }}
                >
                  <strong>
                    <MessageCircle size={10} style={{ display: 'inline', marginRight: 4 }} />
                    {n.label}
                  </strong>
                  <p>{n.comments?.[n.comments.length - 1]?.text}</p>
                </motion.div>
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
              nodeTypes={nodeTypes}
              snapToGrid={true}
              snapGrid={[20, 20]}
              fitView
              deleteKeyCode="Backspace"
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} color="#1f1f2e" />
              <Controls />
              <MiniMap 
                nodeColor={() => '#3b82f6'}
                maskColor="rgba(0,0,0,0.8)"
              />
              <Panel position="top-left" className="diagram-info">
                <div className="diagram-info-header">
                  <h3>{diagram.name}</h3>
                  <motion.button
                    className="copy-link-btn"
                    onClick={copyShareLink}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Copy shareable link"
                  >
                    {linkCopied ? <Check size={14} /> : <Link size={14} />}
                    <span>{linkCopied ? 'Copied!' : 'Share'}</span>
                  </motion.button>
                </div>
                <p className="hint">Drag to connect • Backspace to delete</p>
              </Panel>
            </ReactFlow>
          )}
        </main>
      </div>

      <CreateDiagramModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadDiagrams()
        }}
        preSelectedRepo={selectedRepoPath}
      />
    </div>
  )
}

export default App
