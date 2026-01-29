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

// List all diagrams
app.get('/diagrams', async (req, res) => {
  try {
    const files = await fs.readdir(ALIGNER_DIR);
    const diagrams = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const content = await fs.readFile(path.join(ALIGNER_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        diagrams.push({
          filename: file,
          name: data.name || file.replace('.json', ''),
          modified: data.metadata?.modified || data.metadata?.created,
        });
      } catch {
        // Skip invalid files
      }
    }

    res.json(diagrams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list diagrams' });
  }
});

// Get a specific diagram
app.get('/diagram/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = path.join(ALIGNER_DIR, filename);
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

// Save/update a diagram
app.put('/diagram/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const data = req.body;
    data.metadata = data.metadata || {};
    data.metadata.modified = new Date().toISOString();

    const filepath = path.join(ALIGNER_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    
    console.log(`💾 Saved: ${filename}`);
    res.json(data);
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to save diagram' });
  }
});

// Create a new diagram
app.post('/diagram', async (req, res) => {
  try {
    const { name, ...rest } = req.body;
    const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = path.join(ALIGNER_DIR, filename);

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

    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`✨ Created: ${filename}`);
    res.status(201).json({ filename, ...data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create diagram' });
  }
});

// Delete a diagram
app.delete('/diagram/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(ALIGNER_DIR, filename);
    await fs.unlink(filepath);
    console.log(`🗑️  Deleted: ${filename}`);
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Diagram not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete diagram' });
    }
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

start();
