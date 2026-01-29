// File sync hook - polls for changes and saves edits
// In production, this would use WebSocket or file system events

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlignerDiagram } from '../types';

const POLL_INTERVAL = 1000; // 1 second
const API_BASE = 'http://localhost:3001';

export function useFileSync(filename: string) {
  const [diagram, setDiagram] = useState<AlignerDiagram | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastModified, setLastModified] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load diagram
  const loadDiagram = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/diagram/${encodeURIComponent(filename)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setDiagram(null);
          setError('Diagram not found');
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
        return;
      }
      const data = await res.json();
      const modified = data.metadata?.modified || data.metadata?.created;
      
      // Only update if file changed externally
      if (modified !== lastModified) {
        setDiagram(data);
        setLastModified(modified);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filename, lastModified]);

  // Save diagram (debounced)
  const saveDiagram = useCallback(async (data: AlignerDiagram) => {
    // Clear pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/diagram/${encodeURIComponent(filename)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const saved = await res.json();
        setLastModified(saved.metadata?.modified);
      } catch (err) {
        console.error('Save failed:', err);
      }
    }, 300);
  }, [filename]);

  // Initial load
  useEffect(() => {
    loadDiagram();
  }, [loadDiagram]);

  // Poll for external changes
  useEffect(() => {
    const interval = setInterval(loadDiagram, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadDiagram]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { diagram, setDiagram, saveDiagram, error, loading };
}
