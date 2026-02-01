/**
 * Integration tests for Multi-Repo Diagram Listing
 * Tests GET /diagrams with multiple registered repos and global directory
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

// Dynamic import to allow server startup
let request;

const TEST_REGISTRY_PATH = path.join(homedir(), '.aligner', 'registry.json');
const TEST_BACKUP_PATH = TEST_REGISTRY_PATH + '.backup';
const GLOBAL_DIR = path.join(homedir(), '.aligner', 'global');

/**
 * Setup test environment
 */
async function setupTests() {
  // Backup existing registry if it exists
  try {
    await fs.copyFile(TEST_REGISTRY_PATH, TEST_BACKUP_PATH);
    console.log('  → Backed up existing registry');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('  → Failed to backup registry:', err.message);
    }
  }

  // Clear registry for clean tests
  try {
    await fs.unlink(TEST_REGISTRY_PATH);
  } catch {
    // Ignore if doesn't exist
  }

  // Ensure global directory exists
  await fs.mkdir(GLOBAL_DIR, { recursive: true });

  // Import supertest - do this once at module level
  if (!request) {
    const supertest = await import('supertest');
    const { default: app } = await import('./index.js');
    request = supertest.default(app);
  }
}

/**
 * Cleanup test environment
 */
async function cleanupTests() {
  // Restore registry backup
  try {
    await fs.copyFile(TEST_BACKUP_PATH, TEST_REGISTRY_PATH);
    await fs.unlink(TEST_BACKUP_PATH);
    console.log('  → Restored registry from backup');
  } catch (err) {
    // If no backup, just remove test registry
    try {
      await fs.unlink(TEST_REGISTRY_PATH);
    } catch {
      // Ignore
    }
  }
}

/**
 * Create a temporary test repository with .aligner directory
 */
async function createTestRepo(name = 'test-repo') {
  const tmpDir = path.join('/tmp', `aligner-test-${Date.now()}-${name}`);
  const alignerDir = path.join(tmpDir, '.aligner');

  await fs.mkdir(alignerDir, { recursive: true });

  return tmpDir;
}

/**
 * Create a test diagram file in a directory
 */
async function createTestDiagram(dirPath, filename, diagramData) {
  const filepath = path.join(dirPath, filename);
  await fs.writeFile(filepath, JSON.stringify(diagramData, null, 2));
}

/**
 * Remove a directory and all contents
 */
async function removeDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

// Run setup before all tests
before(setupTests);

// Run cleanup after all tests
after(cleanupTests);

describe('Multi-Repo Diagram Listing', () => {
  it('should return empty array when no repos registered and no global diagrams', async () => {
    const res = await request.get('/diagrams');

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 0);
  });

  it('should return diagrams from global directory', async () => {
    // Create test diagram in global
    const diagram = {
      name: 'Global Test Diagram',
      metadata: { created: new Date().toISOString() }
    };
    await createTestDiagram(GLOBAL_DIR, 'test-global.json', diagram);

    const res = await request.get('/diagrams');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].filename, 'test-global.json');
    assert.strictEqual(res.body[0].name, 'Global Test Diagram');
    assert.strictEqual(res.body[0].repo, 'Global');
    assert.strictEqual(res.body[0].repoPath, 'global');

    // Cleanup
    await fs.unlink(path.join(GLOBAL_DIR, 'test-global.json'));
  });

  it('should return diagrams from multiple registered repos', async () => {
    // Create two test repos
    const repo1 = await createTestRepo('repo1');
    const repo2 = await createTestRepo('repo2');

    // Register both repos
    await request.post('/repos/register').send({ path: repo1, name: 'Repo One' });
    await request.post('/repos/register').send({ path: repo2, name: 'Repo Two' });

    // Create diagrams in each repo
    const diagram1 = {
      name: 'Diagram in Repo 1',
      metadata: { created: new Date().toISOString() }
    };
    const diagram2 = {
      name: 'Diagram in Repo 2',
      metadata: { created: new Date().toISOString() }
    };

    await createTestDiagram(path.join(repo1, '.aligner'), 'diagram1.json', diagram1);
    await createTestDiagram(path.join(repo2, '.aligner'), 'diagram2.json', diagram2);

    const res = await request.get('/diagrams');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);

    // Find diagrams by name
    const d1 = res.body.find(d => d.filename === 'diagram1.json');
    const d2 = res.body.find(d => d.filename === 'diagram2.json');

    assert.ok(d1, 'Diagram 1 should be in response');
    assert.ok(d2, 'Diagram 2 should be in response');

    assert.strictEqual(d1.name, 'Diagram in Repo 1');
    assert.strictEqual(d1.repo, 'Repo One');
    assert.strictEqual(d1.repoPath, repo1);

    assert.strictEqual(d2.name, 'Diagram in Repo 2');
    assert.strictEqual(d2.repo, 'Repo Two');
    assert.strictEqual(d2.repoPath, repo2);

    // Cleanup
    await removeDir(repo1);
    await removeDir(repo2);
  });

  it('should include both repo diagrams and global diagrams', async () => {
    // Create a test repo
    const repo = await createTestRepo('mixed-repo');
    await request.post('/repos/register').send({ path: repo, name: 'Test Repo' });

    // Create diagram in repo
    const repoDiagram = {
      name: 'Repo Diagram',
      metadata: { created: new Date().toISOString() }
    };
    await createTestDiagram(path.join(repo, '.aligner'), 'repo-diagram.json', repoDiagram);

    // Create diagram in global
    const globalDiagram = {
      name: 'Global Diagram',
      metadata: { created: new Date().toISOString() }
    };
    await createTestDiagram(GLOBAL_DIR, 'global-diagram.json', globalDiagram);

    const res = await request.get('/diagrams');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);

    const repoD = res.body.find(d => d.filename === 'repo-diagram.json');
    const globalD = res.body.find(d => d.filename === 'global-diagram.json');

    assert.ok(repoD);
    assert.ok(globalD);

    assert.strictEqual(repoD.repo, 'Test Repo');
    assert.strictEqual(globalD.repo, 'Global');

    // Cleanup
    await removeDir(repo);
    await fs.unlink(path.join(GLOBAL_DIR, 'global-diagram.json'));
  });

  it('should gracefully skip missing repos without error', async () => {
    // Create and register a repo
    const repo = await createTestRepo('temp-repo');
    await request.post('/repos/register').send({ path: repo, name: 'Temp Repo' });

    // Add a diagram to the repo
    const diagram = {
      name: 'Temp Diagram',
      metadata: { created: new Date().toISOString() }
    };
    await createTestDiagram(path.join(repo, '.aligner'), 'temp.json', diagram);

    // Verify diagram is listed
    let res = await request.get('/diagrams');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].filename, 'temp.json');

    // Now delete the repo directory (simulate missing repo)
    await removeDir(repo);

    // GET /diagrams should still work, just skip the missing repo
    res = await request.get('/diagrams');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 0); // No diagrams since repo is gone

    // No error should be thrown - graceful degradation
  });

  it('should include repo metadata (repo name and path) in response', async () => {
    const repo = await createTestRepo('metadata-test');
    await request.post('/repos/register').send({ path: repo, name: 'Metadata Test Repo' });

    const diagram = {
      name: 'Test Diagram',
      metadata: { created: new Date().toISOString() }
    };
    await createTestDiagram(path.join(repo, '.aligner'), 'test.json', diagram);

    const res = await request.get('/diagrams');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 1);

    const d = res.body[0];

    // Verify all required fields are present
    assert.ok(d.filename, 'Should have filename');
    assert.ok(d.name, 'Should have name');
    assert.ok(d.repo, 'Should have repo field');
    assert.ok(d.repoPath, 'Should have repoPath field');

    assert.strictEqual(d.repo, 'Metadata Test Repo');
    assert.strictEqual(d.repoPath, repo);

    // Cleanup
    await removeDir(repo);
  });
});
