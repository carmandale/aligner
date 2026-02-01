#!/usr/bin/env node
/**
 * aligner register - Add current directory to registry
 *
 * Registers the current directory in ~/.aligner/registry.json
 * Requires .aligner/ directory to exist
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRepo } from '../server/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const BLUE = '\x1b[0;34m';
const NC = '\x1b[0m';

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    name: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name' || arg === '-n') {
      options.name = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

/**
 * Show usage help
 */
function showHelp() {
  console.log(`${BLUE}⚡ aligner register${NC} - Add current directory to registry

Usage:
  aligner register [options]

Options:
  --name, -n <name>    Custom display name for this repo
  --help, -h           Show this help

Description:
  Registers the current directory in ~/.aligner/registry.json.
  The directory must have a .aligner/ subdirectory.
  Safe to run multiple times (idempotent).

Examples:
  aligner register                    # Use directory name as display name
  aligner register --name "My Project"  # Custom display name
`);
}

/**
 * Main register logic
 */
async function register(options) {
  const cwd = process.cwd();
  const alignerDir = path.join(cwd, '.aligner');

  // 1. Validate .aligner/ directory exists
  try {
    await fs.access(alignerDir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`${RED}✗${NC} No .aligner/ directory found in current directory`);
      console.error(`  Run ${BLUE}aligner init${NC} first to create it`);
      process.exit(1);
    } else {
      throw err;
    }
  }

  // 2. Register the repo in registry.json
  try {
    const displayName = options.name || path.basename(cwd);
    const repo = await registerRepo(cwd, displayName);

    console.log(`${GREEN}✓${NC} Registered repo: ${BLUE}${repo.name}${NC}`);
    console.log(`  Path: ${repo.path}`);
    console.log(`  Added: ${repo.addedAt}`);
  } catch (err) {
    console.error(`${RED}✗${NC} Failed to register repo: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    await register(options);
  } catch (err) {
    console.error(`${RED}Error:${NC} ${err.message}`);
    process.exit(1);
  }
}

main();
