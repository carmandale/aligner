/**
 * Integration tests for Registry API Endpoints
 * Tests GET /repos, POST /repos/register, DELETE /repos/:path, PATCH /repos/:path
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import to allow server startup
let request;

const TEST_REGISTRY_PATH = path.join(homedir(), '.aligner', 'registry.json');
const TEST_BACKUP_PATH = TEST_REGISTRY_PATH + '.backup';

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
 * Returns just the path string (cleanup is handled separately)
 */
async function createTestRepo(name = 'test-repo') {
  const tmpDir = path.join('/tmp', `aligner-test-${Date.now()}-${name}`);
  const alignerDir = path.join(tmpDir, '.aligner');

  await fs.mkdir(alignerDir, { recursive: true });

  return tmpDir;
}

/**
 * Cleanup a test repository
 */
async function cleanupTestRepo(repoPath) {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to cleanup ${repoPath}:`, err.message);
  }
}

// ========================================
// Test Suite
// ========================================

describe('Registry API Endpoints', () => {
  beforeEach(async () => {
    await setupTests();
  });

  afterEach(async () => {
    await cleanupTests();
  });

  // ========================================
  // GET /repos
  // ========================================

  describe('GET /repos', () => {
    it('should return empty arrays when no repos registered', async () => {
      const res = await request.get('/repos');

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, {
        repos: [],
        missing: []
      });
    });

    it('should return registered repos with status=ok', async () => {
      const testRepo = await createTestRepo('ok-repo');

      try {
        // Register repo
        await request.post('/repos/register').send({
          path: testRepo,
          name: 'OK Repo'
        });

        // List repos
        const res = await request.get('/repos');

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.repos.length, 1);
        assert.strictEqual(res.body.missing.length, 0);
        assert.strictEqual(res.body.repos[0].path, testRepo);
        assert.strictEqual(res.body.repos[0].name, 'OK Repo');
        assert.strictEqual(res.body.repos[0].status, 'ok');
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should mark deleted repos as missing', async () => {
      const testRepo = await createTestRepo('missing-repo');

      // Register repo
      await request.post('/repos/register').send({
        path: testRepo,
        name: 'Missing Repo'
      });

      // Delete repo from filesystem
      await cleanupTestRepo(testRepo);

      // List repos
      const res = await request.get('/repos');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.repos.length, 0);
      assert.strictEqual(res.body.missing.length, 1);
      assert.strictEqual(res.body.missing[0].path, testRepo);
      assert.strictEqual(res.body.missing[0].status, 'missing');
    });

    it('should handle multiple repos with mixed status', async () => {
      const repo1 = await createTestRepo('repo-1');
      const repo2 = await createTestRepo('repo-2');

      try {
        // Register both
        await request.post('/repos/register').send({ path: repo1, name: 'Repo 1' });
        await request.post('/repos/register').send({ path: repo2, name: 'Repo 2' });

        // Delete repo2
        await cleanupTestRepo(repo2);

        // List repos
        const res = await request.get('/repos');

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.repos.length, 1);
        assert.strictEqual(res.body.missing.length, 1);
        assert.strictEqual(res.body.repos[0].name, 'Repo 1');
        assert.strictEqual(res.body.missing[0].name, 'Repo 2');
      } finally {
        await cleanupTestRepo(repo1);
      }
    });
  });

  // ========================================
  // POST /repos/register
  // ========================================

  describe('POST /repos/register', () => {
    it('should register a new repository', async () => {
      const testRepo = await createTestRepo('new-repo');

      try {
        const res = await request.post('/repos/register').send({
          path: testRepo,
          name: 'New Repo'
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.repo.path, testRepo);
        assert.strictEqual(res.body.repo.name, 'New Repo');
        assert.ok(res.body.repo.addedAt);
        assert.strictEqual(res.body.repos.length, 1);
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should use directory name if name not provided', async () => {
      const testRepo = await createTestRepo('default-name');

      try {
        const res = await request.post('/repos/register').send({
          path: testRepo
        });

        assert.strictEqual(res.status, 200);
        assert.ok(res.body.repo.name.includes('default-name'));
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should be idempotent - return existing repo if already registered', async () => {
      const testRepo = await createTestRepo('idempotent-repo');

      try {
        // Register first time
        const res1 = await request.post('/repos/register').send({
          path: testRepo,
          name: 'First Name'
        });

        // Register again with different name
        const res2 = await request.post('/repos/register').send({
          path: testRepo,
          name: 'Second Name'
        });

        assert.strictEqual(res2.status, 200);
        assert.strictEqual(res2.body.repo.name, 'First Name'); // Should keep original name
        assert.strictEqual(res2.body.repos.length, 1); // Should not create duplicate
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should return 400 if path is missing', async () => {
      const res = await request.post('/repos/register').send({
        name: 'No Path'
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'Path is required');
    });

    it('should return 400 if path does not exist', async () => {
      const res = await request.post('/repos/register').send({
        path: '/nonexistent/path/to/repo',
        name: 'Nonexistent'
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'Path does not exist');
    });

    it('should return 400 if .aligner directory is missing', async () => {
      const tmpDir = path.join('/tmp', `aligner-no-dir-${Date.now()}`);

      try {
        // Create directory WITHOUT .aligner subdirectory
        await fs.mkdir(tmpDir, { recursive: true });

        const res = await request.post('/repos/register').send({
          path: tmpDir,
          name: 'No Aligner Dir'
        });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.error, 'No .aligner/ directory found');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ========================================
  // DELETE /repos/:encodedPath
  // ========================================

  describe('DELETE /repos/:encodedPath', () => {
    it('should unregister a repository', async () => {
      const testRepo = await createTestRepo('delete-repo');

      try {
        // Register repo
        await request.post('/repos/register').send({
          path: testRepo,
          name: 'Delete Me'
        });

        // Unregister
        const encodedPath = encodeURIComponent(testRepo);
        const res = await request.delete(`/repos/${encodedPath}`);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.repos.length, 0);
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should handle URL-encoded paths with special characters', async () => {
      const testRepo = await createTestRepo('repo with spaces');

      try {
        // Register repo
        await request.post('/repos/register').send({
          path: testRepo,
          name: 'Spaces Repo'
        });

        // Unregister with URL encoding
        const encodedPath = encodeURIComponent(testRepo);
        const res = await request.delete(`/repos/${encodedPath}`);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should return 404 if repo not found in registry', async () => {
      const encodedPath = encodeURIComponent('/nonexistent/repo');
      const res = await request.delete(`/repos/${encodedPath}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error, 'Repo not found');
    });

    it('should only remove specified repo from registry', async () => {
      const repo1 = await createTestRepo('keep-repo');
      const repo2 = await createTestRepo('delete-repo');

      try {
        // Register both
        await request.post('/repos/register').send({ path: repo1, name: 'Keep' });
        await request.post('/repos/register').send({ path: repo2, name: 'Delete' });

        // Delete only repo2
        const encodedPath = encodeURIComponent(repo2);
        const res = await request.delete(`/repos/${encodedPath}`);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.repos.length, 1);
        assert.strictEqual(res.body.repos[0].path, repo1);
      } finally {
        await cleanupTestRepo(repo1);
        await cleanupTestRepo(repo2);
      }
    });
  });

  // ========================================
  // PATCH /repos/:encodedPath
  // ========================================

  describe('PATCH /repos/:encodedPath', () => {
    it('should update repository name', async () => {
      const testRepo = await createTestRepo('patch-repo');

      try {
        // Register repo
        await request.post('/repos/register').send({
          path: testRepo,
          name: 'Original Name'
        });

        // Update name
        const encodedPath = encodeURIComponent(testRepo);
        const res = await request.patch(`/repos/${encodedPath}`).send({
          name: 'Updated Name'
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.repo.name, 'Updated Name');
        assert.strictEqual(res.body.repo.path, testRepo);
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should handle URL-encoded paths with special characters', async () => {
      const testRepo = await createTestRepo('patch with spaces');

      try {
        // Register repo
        await request.post('/repos/register').send({
          path: testRepo,
          name: 'Original'
        });

        // Update with URL encoding
        const encodedPath = encodeURIComponent(testRepo);
        const res = await request.patch(`/repos/${encodedPath}`).send({
          name: 'Updated'
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.repo.name, 'Updated');
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should return 400 if name is missing', async () => {
      const testRepo = await createTestRepo('no-name-repo');

      try {
        // Register repo
        await request.post('/repos/register').send({
          path: testRepo,
          name: 'Test'
        });

        // Try to update without name
        const encodedPath = encodeURIComponent(testRepo);
        const res = await request.patch(`/repos/${encodedPath}`).send({});

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.error, 'Name is required');
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });

    it('should return 404 if repo not found in registry', async () => {
      const encodedPath = encodeURIComponent('/nonexistent/repo');
      const res = await request.patch(`/repos/${encodedPath}`).send({
        name: 'New Name'
      });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error, 'Repo not found');
    });

    it('should persist name change across requests', async () => {
      const testRepo = await createTestRepo('persist-repo');

      try {
        // Register repo
        await request.post('/repos/register').send({
          path: testRepo,
          name: 'Original'
        });

        // Update name
        const encodedPath = encodeURIComponent(testRepo);
        await request.patch(`/repos/${encodedPath}`).send({
          name: 'Updated'
        });

        // Verify change persisted
        const res = await request.get('/repos');
        assert.strictEqual(res.body.repos[0].name, 'Updated');
      } finally {
        await cleanupTestRepo(testRepo);
      }
    });
  });
});
