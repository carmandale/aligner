/**
 * Registry Manager
 * Manages the central registry of registered repositories at ~/.aligner/registry.json
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

const REGISTRY_FILENAME = 'registry.json';

/**
 * Get the path to the registry file
 * @returns {string} Absolute path to registry.json
 */
function getRegistryPath() {
  return path.join(homedir(), '.aligner', REGISTRY_FILENAME);
}

/**
 * Load the registry from disk
 * @returns {Promise<{version: string, repos: Array}>} Registry object
 */
export async function loadRegistry() {
  const registryPath = getRegistryPath();

  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(content);
    return registry;
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist - return empty registry
      return { version: '1.0', repos: [] };
    }

    // Parse error or other error - log and return empty registry
    console.error('Failed to load registry, returning empty:', err.message);
    return { version: '1.0', repos: [] };
  }
}

/**
 * Save the registry to disk using atomic write-and-rename
 * @param {{version: string, repos: Array}} registry - Registry object to save
 * @returns {Promise<void>}
 */
export async function saveRegistry(registry) {
  const registryPath = getRegistryPath();
  const registryDir = path.dirname(registryPath);
  const tempPath = `${registryPath}.tmp`;

  try {
    // Ensure directory exists
    await fs.mkdir(registryDir, { recursive: true });

    // Write to temp file
    await fs.writeFile(tempPath, JSON.stringify(registry, null, 2), 'utf-8');

    // Atomic rename
    await fs.rename(tempPath, registryPath);
  } catch (err) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(`Failed to save registry: ${err.message}`);
  }
}

/**
 * Register a repository in the registry (idempotent)
 * @param {string} repoPath - Absolute path to repository root
 * @param {string} [name] - Optional display name (defaults to directory name)
 * @returns {Promise<{path: string, name: string, addedAt: string}>} The registered repo object
 */
export async function registerRepo(repoPath, name) {
  const registry = await loadRegistry();

  // Check if already registered (idempotent)
  const existing = registry.repos.find(r => r.path === repoPath);
  if (existing) {
    return existing;
  }

  // Create new repo entry
  const repoName = name || path.basename(repoPath);
  const repo = {
    path: repoPath,
    name: repoName,
    addedAt: new Date().toISOString(),
  };

  registry.repos.push(repo);
  await saveRegistry(registry);

  return repo;
}

/**
 * Unregister a repository from the registry
 * @param {string} repoPath - Absolute path to repository root
 * @returns {Promise<void>}
 */
export async function unregisterRepo(repoPath) {
  const registry = await loadRegistry();

  // Filter out the repo
  registry.repos = registry.repos.filter(r => r.path !== repoPath);

  await saveRegistry(registry);
}

/**
 * Get the .aligner directory path for a given repo
 * @param {string} repoPath - Repository path or "global"
 * @returns {string} Absolute path to .aligner directory
 */
export function getAlignerDir(repoPath) {
  if (!repoPath || repoPath === 'global') {
    return path.join(homedir(), '.aligner', 'global');
  }

  return path.join(repoPath, '.aligner');
}
