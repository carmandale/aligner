import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Folder } from 'lucide-react'

interface Repo {
  path: string
  name: string
  status: string
}

interface CreateDiagramModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preSelectedRepo?: string
}

const API = 'http://localhost:3001'

export function CreateDiagramModal({
  isOpen,
  onClose,
  onSuccess,
  preSelectedRepo = 'global'
}: CreateDiagramModalProps) {
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>(preSelectedRepo)
  const [diagramName, setDiagramName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch repos when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch(`${API}/repos`)
        .then(r => r.json())
        .then(data => {
          // Add "Global" option
          const allRepos = [
            { path: 'global', name: 'Global', status: 'ok' },
            ...data.repos.filter((r: Repo) => r.status === 'ok')
          ]
          setRepos(allRepos)

          // Pre-select repo if provided
          if (preSelectedRepo) {
            setSelectedRepo(preSelectedRepo)
          }
        })
        .catch(() => {
          // Fallback to just Global if API fails
          setRepos([{ path: 'global', name: 'Global', status: 'ok' }])
        })
    }
  }, [isOpen, preSelectedRepo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!diagramName.trim() || !selectedRepo) return

    setIsLoading(true)
    setError(null)

    try {
      // Encode repo path for URL if not "global"
      const repoParam = selectedRepo === 'global'
        ? 'global'
        : encodeURIComponent(selectedRepo)

      const response = await fetch(`${API}/diagram/${repoParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: diagramName,
          version: '1.0',
          nodes: [],
          edges: [],
          metadata: { description: '' }
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to create diagram')
      }

      // Success!
      setDiagramName('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create diagram')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setDiagramName('')
    setError(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                <h2>Create New Diagram</h2>
              </div>
              <button
                className="modal-close"
                onClick={handleClose}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Diagram Name */}
                <div className="form-group">
                  <label htmlFor="diagram-name">
                    Diagram Name
                  </label>
                  <input
                    id="diagram-name"
                    type="text"
                    value={diagramName}
                    onChange={e => setDiagramName(e.target.value)}
                    placeholder="e.g., Authentication Flow"
                    autoFocus
                    required
                  />
                </div>

                {/* Repo Selection */}
                <div className="form-group">
                  <label htmlFor="repo-select">
                    <Folder size={14} className="inline" style={{ marginRight: 4 }} />
                    Repository
                  </label>
                  <select
                    id="repo-select"
                    value={selectedRepo}
                    onChange={e => setSelectedRepo(e.target.value)}
                    required
                  >
                    {repos.map(repo => (
                      <option key={repo.path} value={repo.path}>
                        {repo.name}
                      </option>
                    ))}
                  </select>
                  <p className="help-text">
                    Choose where to save this diagram
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    className="error-message"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}
                  </motion.div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading || !diagramName.trim()}
                >
                  {isLoading ? 'Creating...' : 'Create Diagram'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
