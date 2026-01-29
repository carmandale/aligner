// Hook to list available diagrams

import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3001';

export interface DiagramInfo {
  name: string;
  filename: string;
  modified?: string;
}

export function useDiagramList() {
  const [diagrams, setDiagrams] = useState<DiagramInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/diagrams`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDiagrams(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diagrams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { diagrams, loading, error, refresh };
}
