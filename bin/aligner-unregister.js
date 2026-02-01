#!/usr/bin/env node
/**
 * aligner unregister - Remove current directory from registry
 *
 * Removes the current directory from ~/.aligner/registry.json
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { unregisterRepo, loadRegistry } from '../server/registry.js';

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
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

/**
 * Show usage help
 */
function showHelp() {
  console.log(`${BLUE}⚡ aligner unregister${NC} - Remove current directory from registry

Usage:
  aligner unregister [options]

Options:
  --help, -h    Show this help

Description:
  Removes the current directory from ~/.aligner/registry.json.
  Does not delete the .aligner/ directory or any diagrams.
  Safe to run even if not registered.

Examples:
  aligner unregister
`);
}

/**
 * Main unregister logic
 */
async function unregister() {
  const cwd = process.cwd();

  // 1. Check if repo is registered
  const registry = await loadRegistry();
  const existing = registry.repos.find(r => r.path === cwd);

  if (!existing) {
    console.log(`${YELLOW}⏭${NC} Repo not registered: ${cwd}`);
    return;
  }

  // 2. Unregister the repo
  try {
    await unregisterRepo(cwd);
    console.log(`${GREEN}✓${NC} Unregistered repo: ${BLUE}${existing.name}${NC}`);
    console.log(`  Path: ${cwd}`);
  } catch (err) {
    console.error(`${RED}✗${NC} Failed to unregister repo: ${err.message}`);
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
    await unregister();
  } catch (err) {
    console.error(`${RED}Error:${NC} ${err.message}`);
    process.exit(1);
  }
}

main();
