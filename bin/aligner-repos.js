#!/usr/bin/env node
/**
 * aligner repos - List all registered repositories
 *
 * Displays all registered repos from ~/.aligner/registry.json with status
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadRegistry } from '../server/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const BLUE = '\x1b[0;34m';
const NC = '\x1b[0m';
const BOLD = '\x1b[1m';

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
  console.log(`${BLUE}⚡ aligner repos${NC} - List all registered repositories

Usage:
  aligner repos [options]

Options:
  --help, -h    Show this help

Description:
  Displays all repositories registered in ~/.aligner/registry.json.
  Shows status (ok or missing) for each repo based on path existence.

Examples:
  aligner repos
`);
}

/**
 * Check if a path exists
 */
async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main repos listing logic
 */
async function listRepos() {
  const registry = await loadRegistry();

  if (registry.repos.length === 0) {
    console.log(`${YELLOW}No repositories registered${NC}`);
    console.log(`  Run ${BLUE}aligner init${NC} or ${BLUE}aligner register${NC} to add one`);
    return;
  }

  console.log(`${BLUE}${BOLD}Registered Repositories${NC}\n`);

  // Check status of each repo
  const reposWithStatus = await Promise.all(
    registry.repos.map(async (repo) => {
      const exists = await pathExists(repo.path);
      return {
        ...repo,
        status: exists ? 'ok' : 'missing',
      };
    })
  );

  // Find max name length for formatting
  const maxNameLen = Math.max(...reposWithStatus.map(r => r.name.length), 10);
  const maxPathLen = Math.max(...reposWithStatus.map(r => r.path.length), 10);

  // Print header
  console.log(`${BOLD}${'Name'.padEnd(maxNameLen)}  ${'Path'.padEnd(maxPathLen)}  Status${NC}`);
  console.log('─'.repeat(maxNameLen + maxPathLen + 15));

  // Print repos
  let okCount = 0;
  let missingCount = 0;

  for (const repo of reposWithStatus) {
    const statusColor = repo.status === 'ok' ? GREEN : RED;
    const statusText = repo.status === 'ok' ? '✓ ok' : '✗ missing';

    console.log(
      `${repo.name.padEnd(maxNameLen)}  ${repo.path.padEnd(maxPathLen)}  ${statusColor}${statusText}${NC}`
    );

    if (repo.status === 'ok') {
      okCount++;
    } else {
      missingCount++;
    }
  }

  // Print summary
  console.log();
  const total = registry.repos.length;
  console.log(`${BOLD}Summary:${NC} ${total} repos registered (${GREEN}${okCount} ok${NC}, ${RED}${missingCount} missing${NC})`);
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
    await listRepos();
  } catch (err) {
    console.error(`${RED}Error:${NC} ${err.message}`);
    process.exit(1);
  }
}

main();
