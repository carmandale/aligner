#!/usr/bin/env node
/**
 * aligner init - Initialize current directory as an Aligner repository
 *
 * Creates .aligner/ directory and registers the repo in ~/.aligner/registry.json
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
  console.log(`${BLUE}⚡ aligner init${NC} - Initialize current directory as an Aligner repository

Usage:
  aligner init [options]

Options:
  --name, -n <name>    Custom display name for this repo
  --help, -h           Show this help

Description:
  Creates a .aligner/ directory in the current working directory and
  registers the repo in ~/.aligner/registry.json. Safe to run multiple
  times (idempotent).

Examples:
  aligner init                    # Use directory name as display name
  aligner init --name "My Project"  # Custom display name
`);
}

/**
 * Main init logic
 */
async function init(options) {
  const cwd = process.cwd();
  const alignerDir = path.join(cwd, '.aligner');

  console.log(`${BLUE}Initializing Aligner repository...${NC}\n`);

  // 1. Check if .aligner/ already exists
  try {
    await fs.access(alignerDir);
    console.log(`${YELLOW}✓${NC} .aligner/ directory already exists`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Create .aligner/ directory
      await fs.mkdir(alignerDir, { recursive: true });
      console.log(`${GREEN}✓${NC} Created .aligner/ directory`);
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

  console.log(`\n${GREEN}✓ Initialization complete!${NC}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Start Aligner: ${BLUE}aligner start${NC}`);
  console.log(`  2. Create diagrams in the web UI or via JSON files`);
  console.log(`  3. Diagrams will be saved to ${BLUE}.aligner/${NC}`);
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
    await init(options);
  } catch (err) {
    console.error(`${RED}Error:${NC} ${err.message}`);
    process.exit(1);
  }
}

main();
