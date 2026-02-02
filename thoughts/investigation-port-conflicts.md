# Investigation: Port conflicts / viewer can't connect

## Summary
Viewer and API/WS URLs are hardcoded to fixed ports (5173/3001). When those ports are in use, Vite auto-selects a different port or the API fails to start, causing Safari to fail to connect and WebSocket/API errors in the UI.

## Symptoms
- Safari shows "Can't connect to the server" for `http://localhost:5173`.
- DevTools reports WebSocket connection errors to `ws://localhost:3001`.
- Multiple other servers/processes are running and occupying common ports.

## Investigation Log

### 2026-02-02 - Codebase scan (ports/URLs)
**Hypothesis:** Hardcoded ports cause viewer/API mismatches when ports are busy.
**Findings:**
- Frontend API base and WS URL are hardcoded to `localhost:3001`.
- CLI always opens `http://localhost:5173` regardless of the port Vite actually uses.
- E2E script uses a fixed `BASE_URL` on `localhost:3001`.
**Evidence:**
- `src/App.tsx:65` → `const API = 'http://localhost:3001'`
- `src/App.tsx:220` → `new WebSocket('ws://localhost:3001')`
- `src/components/CreateDiagramModal.tsx:18` → `const API = 'http://localhost:3001'`
- `bin/aligner:82` and `bin/aligner:84` → `open "http://localhost:5173"` and `xdg-open "http://localhost:5173"`
- `bin/aligner:113` → `Viewer: http://localhost:5173`
- `server/index.js:17` → `const PORT = process.env.PORT || 3001`
- `test-e2e.sh:12` → `BASE_URL="http://localhost:3001"`
**Conclusion:** Confirmed: fixed ports and URLs are a root cause of connection failures when ports are occupied.

## Root Cause
The viewer and backend assume fixed ports (`5173` and `3001`). When ports are already in use, Vite auto-selects a new port, and/or the backend fails to bind. The frontend still tries to connect to the hardcoded ports, causing UI and WebSocket failures.

## Recommendations
1. Centralize API/WS endpoint configuration in the frontend and read from Vite env vars with sane defaults.
2. Update the CLI to launch Vite on a known, available port (or detect the actual port) and open the correct URL.
3. Allow server port overrides to flow into the viewer via `VITE_` env vars.
4. Make `test-e2e.sh` read a configurable `BASE_URL`.

## Preventive Measures
- Document port overrides and env vars in README.
- Add a small helper to discover free ports in CLI, or enforce strict ports with clear failure messages.
