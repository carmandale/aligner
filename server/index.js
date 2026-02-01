#!/usr/bin/env node

/**
 * Aligner Server
 * Watches ~/.aligner/ directory and serves diagrams via REST API
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { watch } from 'fs';
import { homedir } from 'os';
import { loadRegistry, saveRegistry, registerRepo, unregisterRepo, getAlignerDir } from './registry.js';

const PORT = process.env.PORT || 3001;
const ALIGNER_DIR = process.env.ALIGNER_DIR || path.join(homedir(), '.aligner');

const app = express();
app.use(cors());
app.use(express.json());

// Ensure aligner directory exists
async function ensureDir() {
  try {
    await fs.mkdir(ALIGNER_DIR, { recursive: true });
    console.log(`📁 Aligner directory: ${ALIGNER_DIR}`);
  } catch (err) {
    console.error('Failed to create aligner directory:', err);
  }
}

// Migrate orphaned diagrams from ~/.aligner/*.json to ~/.aligner/global/
async function migrateOrphanedDiagrams() {
  try {
    // Get all files in ALIGNER_DIR
    const files = await fs.readdir(ALIGNER_DIR);

    // Find orphaned .json files (exclude registry.json*)
    const orphanedFiles = files.filter(file =>
      file.endsWith('.json') && !file.startsWith('registry.json')
    );

    if (orphanedFiles.length === 0) {
      return; // Nothing to migrate
    }

    // Create global/ directory if needed
    const globalDir = path.join(ALIGNER_DIR, 'global');
    await fs.mkdir(globalDir, { recursive: true });

    // Migrate each orphaned file
    let migratedCount = 0;
    for (const file of orphanedFiles) {
      const sourcePath = path.join(ALIGNER_DIR, file);
      const targetPath = path.join(globalDir, file);

      // Check if target already exists (idempotency)
      try {
        await fs.access(targetPath);
        console.log(`⏭️  Skipped (already migrated): ${file}`);
        continue;
      } catch {
        // Target doesn't exist - proceed with migration
      }

      // Move file atomically
      try {
        await fs.rename(sourcePath, targetPath);
        console.log(`📦 Migrated to global/: ${file}`);
        migratedCount++;
      } catch (err) {
        console.error(`❌ Failed to migrate ${file}:`, err.message);
      }
    }

    if (migratedCount > 0) {
      console.log(`✅ Migration complete: ${migratedCount} diagram(s) moved to global/`);
    }
  } catch (err) {
    console.error('Migration error:', err);
    // Don't throw - allow server to start even if migration fails
  }
}

/**
 * Resolve diagram path based on repo context
 * @param {string} repo - Either 'global' or URL-encoded absolute path
 * @param {string} filename - Diagram filename (must end with .json)
 * @returns {string} Absolute path to the diagram file
 */
function resolveDiagramPath(repo, filename) {
  if (repo === 'global') {
    return path.join(ALIGNER_DIR, 'global', filename);
  }
  const decodedPath = decodeURIComponent(repo);
  return path.join(decodedPath, '.aligner', filename);
}

// List all diagrams from all registered repos plus global
app.get('/diagrams', async (req, res) => {
  try {
    const registry = await loadRegistry();
    const diagrams = [];

    // Helper function to scan a directory for diagrams
    async function scanDirectory(dirPath, repoName, repoPath) {
      try {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          try {
            const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
            const data = JSON.parse(content);
            diagrams.push({
              filename: file,
              name: data.name || file.replace('.json', ''),
              modified: data.metadata?.modified || data.metadata?.created,
              repo: repoName,
              repoPath: repoPath,
            });
          } catch {
            // Skip invalid files
          }
        }
      } catch (err) {
        // Directory doesn't exist or is inaccessible - skip gracefully
        if (err.code !== 'ENOENT') {
          console.warn(`Warning: Failed to scan ${dirPath}:`, err.message);
        }
      }
    }

    // Scan all registered repos
    for (const repo of registry.repos) {
      const alignerDir = getAlignerDir(repo.path);
      await scanDirectory(alignerDir, repo.name, repo.path);
    }

    // Always include global directory
    const globalDir = getAlignerDir('global');
    await scanDirectory(globalDir, 'Global', 'global');

    res.json(diagrams);
  } catch (err) {
    console.error('Failed to list diagrams:', err);
    res.status(500).json({ error: 'Failed to list diagrams' });
  }
});

// Get a specific diagram (repo-aware)
app.get('/diagram/:repo/:filename', async (req, res) => {
  try {
    const { repo, filename } = req.params;
    if (!filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = resolveDiagramPath(repo, filename);
    const content = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(content);
    res.json(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Diagram not found' });
    } else {
      res.status(500).json({ error: 'Failed to read diagram' });
    }
  }
});

// Backward compatibility: redirect old routes to global
app.get('/diagram/:filename', async (req, res) => {
  const { filename } = req.params;
  return res.redirect(307, `/diagram/global/${filename}`);
});

// Save/update a diagram (repo-aware)
app.put('/diagram/:repo/:filename', async (req, res) => {
  try {
    const { repo, filename } = req.params;
    if (!filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const data = req.body;
    data.metadata = data.metadata || {};
    data.metadata.modified = new Date().toISOString();

    const filepath = resolveDiagramPath(repo, filename);

    // Ensure directory exists (needed for repo paths)
    const dirPath = path.dirname(filepath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filepath, JSON.stringify(data, null, 2));

    console.log(`💾 Saved: ${repo}/${filename}`);
    res.json(data);
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to save diagram' });
  }
});

// Backward compatibility: redirect old routes to global
app.put('/diagram/:filename', async (req, res) => {
  const { filename } = req.params;
  return res.redirect(307, `/diagram/global/${filename}`);
});

// Create a new diagram (repo-aware)
app.post('/diagram/:repo', async (req, res) => {
  try {
    const { repo } = req.params;
    const { name, ...rest } = req.body;
    const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = resolveDiagramPath(repo, filename);

    // Check if exists
    try {
      await fs.access(filepath);
      return res.status(409).json({ error: 'Diagram already exists' });
    } catch {
      // Good - doesn't exist
    }

    const data = {
      version: '1.0',
      name,
      nodes: [],
      edges: [],
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      ...rest,
    };

    // Ensure directory exists (needed for repo paths)
    const dirPath = path.dirname(filepath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`✨ Created: ${repo}/${filename}`);
    res.status(201).json({ filename, ...data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create diagram' });
  }
});

// Backward compatibility: redirect old routes to global
app.post('/diagram', async (req, res) => {
  return res.redirect(307, '/diagram/global');
});

// Delete a diagram (repo-aware)
app.delete('/diagram/:repo/:filename', async (req, res) => {
  try {
    const { repo, filename } = req.params;
    const filepath = resolveDiagramPath(repo, filename);
    await fs.unlink(filepath);
    console.log(`🗑️  Deleted: ${repo}/${filename}`);
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Diagram not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete diagram' });
    }
  }
});

// Backward compatibility: redirect old routes to global
app.delete('/diagram/:filename', async (req, res) => {
  const { filename } = req.params;
  return res.redirect(307, `/diagram/global/${filename}`);
});

// ========================================
// Registry API Endpoints
// ========================================

/**
 * GET /repos - List all registered repositories with status
 * Returns repos split into "ok" and "missing" based on filesystem check
 */
app.get('/repos', async (req, res) => {
  try {
    const registry = await loadRegistry();
    const repos = [];
    const missing = [];

    for (const repo of registry.repos) {
      try {
        // Check if repo path exists
        await fs.access(repo.path);
        // Check if .aligner directory exists
        const alignerDir = getAlignerDir(repo.path);
        await fs.access(alignerDir);
        repos.push({ ...repo, status: 'ok' });
      } catch {
        missing.push({ ...repo, status: 'missing' });
      }
    }

    res.json({ repos, missing });
  } catch (err) {
    console.error('GET /repos error:', err);
    res.status(500).json({ error: 'Failed to list repositories' });
  }
});

/**
 * POST /repos/register - Register a new repository
 * Body: { path: string, name?: string }
 * Validates: path exists, .aligner/ directory exists
 * Idempotent: returns existing repo if already registered
 */
app.post('/repos/register', async (req, res) => {
  try {
    const { path: repoPath, name } = req.body;

    if (!repoPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    // Validate path exists
    try {
      await fs.access(repoPath);
    } catch {
      return res.status(400).json({ error: 'Path does not exist' });
    }

    // Validate .aligner directory exists
    const alignerDir = getAlignerDir(repoPath);
    try {
      await fs.access(alignerDir);
    } catch {
      return res.status(400).json({ error: 'No .aligner/ directory found' });
    }

    // Register (idempotent)
    const repo = await registerRepo(repoPath, name);

    // Return updated list
    const registry = await loadRegistry();
    res.json({ success: true, repo, repos: registry.repos });
  } catch (err) {
    console.error('POST /repos/register error:', err);
    res.status(500).json({ error: 'Failed to register repository' });
  }
});

/**
 * DELETE /repos/:encodedPath - Unregister a repository
 * Path param is URL-encoded repository path
 * Returns 404 if repo not found in registry
 */
app.delete('/repos/:encodedPath', async (req, res) => {
  try {
    const repoPath = decodeURIComponent(req.params.encodedPath);

    // Check if repo exists in registry
    const registry = await loadRegistry();
    const exists = registry.repos.some(r => r.path === repoPath);

    if (!exists) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    // Unregister
    await unregisterRepo(repoPath);

    // Return updated list
    const updated = await loadRegistry();
    res.json({ success: true, repos: updated.repos });
  } catch (err) {
    console.error('DELETE /repos/:encodedPath error:', err);
    res.status(500).json({ error: 'Failed to unregister repository' });
  }
});

/**
 * PATCH /repos/:encodedPath - Update repository name
 * Path param is URL-encoded repository path
 * Body: { name: string }
 * Returns 404 if repo not found
 */
app.patch('/repos/:encodedPath', async (req, res) => {
  try {
    const repoPath = decodeURIComponent(req.params.encodedPath);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Load registry
    const registry = await loadRegistry();

    // Find repo
    const repo = registry.repos.find(r => r.path === repoPath);
    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    // Update name
    repo.name = name;

    // Save registry
    await saveRegistry(registry);

    res.json({ success: true, repo });
  } catch (err) {
    console.error('PATCH /repos/:encodedPath error:', err);
    res.status(500).json({ error: 'Failed to update repository' });
  }
});

// Watch for file changes and log
function watchDirectory() {
  try {
    watch(ALIGNER_DIR, (eventType, filename) => {
      if (filename?.endsWith('.json')) {
        console.log(`👁️  ${eventType}: ${filename}`);
      }
    });
    console.log(`👁️  Watching for changes...`);
  } catch (err) {
    console.error('Watch error:', err);
  }
}

// Start server
async function start() {
  await ensureDir();
  await migrateOrphanedDiagrams();
  watchDirectory();

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║  ⚡ Aligner Server running on port ${PORT}   ║
║                                           ║
║  Diagrams: ${ALIGNER_DIR}
║  API: http://localhost:${PORT}              ║
╚═══════════════════════════════════════════╝
`);
  });
}

// Only start server if this is the main module
// Use pathToFileURL to handle spaces and special characters correctly
import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}

// Export app for testing
export default app;
