#!/usr/bin/env node
/**
 * aligner list - List all diagrams grouped by repository
 *
 * Scans all registered repos + global directory for diagrams
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { loadRegistry, getAlignerDir } from '../server/registry.js';

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
  console.log(`${BLUE}⚡ aligner list${NC} - List all diagrams

Usage:
  aligner list [options]

Options:
  --help, -h    Show this help

Description:
  Lists all diagrams from registered repositories and the global directory.
  Diagrams are grouped by repository for easy navigation.

Examples:
  aligner list
`);
}

/**
 * Check if a directory exists
 */
async function dirExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Scan a directory for .json diagram files
 */
async function scanDiagramsInDir(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const diagrams = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(dirPath, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        diagrams.push({
          filename: file,
          name: data.name || 'Untitled',
          path: filePath,
        });
      } catch (err) {
        // Skip invalid JSON files
      }
    }

    return diagrams;
  } catch {
    return [];
  }
}

/**
 * Main list logic
 */
async function listDiagrams() {
  const registry = await loadRegistry();

  // Build list of all repo directories to scan
  const repoSources = [];

  // 1. Add global directory
  const globalDir = getAlignerDir('global');
  repoSources.push({
    name: 'Global',
    path: 'global',
    dir: globalDir,
  });

  // 2. Add registered repos
  for (const repo of registry.repos) {
    const alignerDir = getAlignerDir(repo.path);
    repoSources.push({
      name: repo.name,
      path: repo.path,
      dir: alignerDir,
    });
  }

  // 3. Scan each directory
  console.log(`${BLUE}${BOLD}Diagrams by Repository${NC}\n`);

  let totalDiagrams = 0;
  let hasAnyDiagrams = false;

  for (const source of repoSources) {
    const exists = await dirExists(source.dir);
    if (!exists) {
      continue; // Skip missing directories silently
    }

    const diagrams = await scanDiagramsInDir(source.dir);

    if (diagrams.length === 0) {
      continue; // Skip empty directories
    }

    hasAnyDiagrams = true;

    // Print repo header
    console.log(`${BLUE}📁 ${source.name}${NC} ${YELLOW}(${diagrams.length})${NC}`);

    // Print diagrams
    for (const diagram of diagrams) {
      console.log(`  ${GREEN}•${NC} ${diagram.filename} - ${diagram.name}`);
    }

    console.log(); // Empty line between repos
    totalDiagrams += diagrams.length;
  }

  // Summary
  if (!hasAnyDiagrams) {
    console.log(`${YELLOW}No diagrams found${NC}`);
    console.log(`  Create one with ${BLUE}aligner start${NC} and use the web UI`);
  } else {
    console.log(`${BOLD}Total: ${totalDiagrams} diagrams${NC}`);
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
    await listDiagrams();
  } catch (err) {
    console.error(`${RED}Error:${NC} ${err.message}`);
    process.exit(1);
  }
}

main();
