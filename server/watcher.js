/**
 * Multi-Repo File Watcher
 * Watches all registered .aligner/ directories for changes using chokidar
 */

import chokidar from 'chokidar';
import path from 'path';
import { EventEmitter } from 'events';

/**
 * Watcher class that monitors multiple .aligner/ directories
 * Emits: 'add', 'change', 'unlink' events with {filePath, repo} payload
 */
export class DiagramWatcher extends EventEmitter {
  constructor() {
    super();
    this.watcher = null;
    this.watchedPaths = new Set();
  }

  /**
   * Initialize watcher with array of paths to monitor
   * @param {Array<{path: string, name: string, isGlobal?: boolean}>} paths - Array of directory paths to watch
   */
  start(paths) {
    if (this.watcher) {
      console.warn('⚠️  Watcher already running - call stop() first');
      return;
    }

    // Convert paths to .aligner/ directories
    const dirsToWatch = paths.map(({ path: repoPath, isGlobal }) => {
      // For global directory, watch the directory itself (not repoPath/.aligner)
      // For repos, watch repoPath/.aligner
      const dir = isGlobal ? repoPath : path.join(repoPath, '.aligner');
      this.watchedPaths.add(dir);
      return dir;
    }).filter(Boolean);

    if (dirsToWatch.length === 0) {
      console.log('👁️  No directories to watch');
      return;
    }

    // Initialize chokidar with all paths
    this.watcher = chokidar.watch(dirsToWatch, {
      depth: 0, // Only watch files directly in .aligner/, not subdirectories
      ignoreInitial: true, // Don't emit events for existing files on startup
      awaitWriteFinish: {
        stabilityThreshold: 100, // Wait 100ms after last change
        pollInterval: 50
      },
      persistent: true
    });

    // Set up event handlers
    this.watcher
      .on('add', (filePath) => this._handleEvent('add', filePath))
      .on('change', (filePath) => this._handleEvent('change', filePath))
      .on('unlink', (filePath) => this._handleEvent('unlink', filePath))
      .on('error', (error) => {
        console.error('👁️  Watcher error:', error);
        this.emit('error', error);
      });

    console.log(`👁️  Watching ${dirsToWatch.length} directories for changes...`);
    dirsToWatch.forEach(dir => console.log(`   - ${dir}`));
  }

  /**
   * Add a new path to watch
   * @param {string} repoPath - Absolute path to repository root
   */
  addPath(repoPath) {
    if (!this.watcher) {
      console.warn('⚠️  Cannot add path - watcher not started');
      return;
    }

    const dir = path.join(repoPath, '.aligner');
    if (this.watchedPaths.has(dir)) {
      console.log(`👁️  Already watching: ${dir}`);
      return;
    }

    this.watcher.add(dir);
    this.watchedPaths.add(dir);
    console.log(`👁️  Added to watch list: ${dir}`);
  }

  /**
   * Remove a path from watching
   * @param {string} repoPath - Absolute path to repository root
   */
  removePath(repoPath) {
    if (!this.watcher) {
      console.warn('⚠️  Cannot remove path - watcher not started');
      return;
    }

    const dir = path.join(repoPath, '.aligner');
    if (!this.watchedPaths.has(dir)) {
      console.log(`👁️  Not watching: ${dir}`);
      return;
    }

    this.watcher.unwatch(dir);
    this.watchedPaths.delete(dir);
    console.log(`👁️  Removed from watch list: ${dir}`);
  }

  /**
   * Stop watching all directories
   */
  async stop() {
    if (!this.watcher) {
      return;
    }

    await this.watcher.close();
    this.watcher = null;
    this.watchedPaths.clear();
    console.log('👁️  Watcher stopped');
  }

  /**
   * Handle file system events
   * @private
   */
  _handleEvent(eventType, filePath) {
    // Only process .json files
    if (!filePath.endsWith('.json')) {
      return;
    }

    // Extract repo info from file path
    const repo = this._getRepoFromPath(filePath);
    const filename = path.basename(filePath);

    console.log(`👁️  ${eventType}: ${filename} (${repo || 'unknown'})`);

    this.emit(eventType, { filePath, repo, filename });
  }

  /**
   * Extract repo name from file path
   * @private
   */
  _getRepoFromPath(filePath) {
    const parts = filePath.split(path.sep);
    const alignerIndex = parts.indexOf('.aligner');

    if (alignerIndex > 0) {
      // If .aligner is in global directory, return 'global'
      if (parts[alignerIndex - 1] === 'global') {
        return 'global';
      }
      // Otherwise return the parent directory name
      return parts[alignerIndex - 1];
    }

    return null;
  }
}

/**
 * Create and configure a watcher instance
 * @param {Array<{path: string, name: string}>} repos - Array of repos to watch
 * @returns {DiagramWatcher} Configured watcher instance
 */
export function createWatcher(repos = []) {
  const watcher = new DiagramWatcher();
  if (repos.length > 0) {
    watcher.start(repos);
  }
  return watcher;
}
