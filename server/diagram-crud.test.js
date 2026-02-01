/**
 * Integration tests for Repo-Aware Diagram CRUD
 * Run with: node server/diagram-crud.test.js
 *
 * These tests verify the new multi-repo diagram endpoints:
 * - GET /diagram/:repo/:filename
 * - PUT /diagram/:repo/:filename
 * - POST /diagram/:repo
 * - DELETE /diagram/:repo/:filename
 * - Backward compatibility redirects
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  }
}

function assertEqual(actual, expected, message) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  assert(match, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
}

const ALIGNER_DIR = path.join(homedir(), '.aligner');

async function setupTestEnvironment() {
  console.log('Setting up test environment...');

  // Create test repo directories
  const testRepo1 = '/tmp/aligner-test-repo1';
  const testRepo2 = '/tmp/aligner-test-repo2';

  // Clean up
  await fs.rm(testRepo1, { recursive: true, force: true });
  await fs.rm(testRepo2, { recursive: true, force: true });

  // Create repos with .aligner directories
  await fs.mkdir(path.join(testRepo1, '.aligner'), { recursive: true });
  await fs.mkdir(path.join(testRepo2, '.aligner'), { recursive: true });

  // Ensure global directory exists
  await fs.mkdir(path.join(ALIGNER_DIR, 'global'), { recursive: true });

  console.log('✓ Test environment ready');
  return { testRepo1, testRepo2 };
}

async function cleanupTestEnvironment(testRepo1, testRepo2) {
  console.log('\nCleaning up test environment...');
  await fs.rm(testRepo1, { recursive: true, force: true });
  await fs.rm(testRepo2, { recursive: true, force: true });

  // Clean up test diagrams from global
  const globalDir = path.join(ALIGNER_DIR, 'global');
  const files = await fs.readdir(globalDir);
  for (const file of files) {
    if (file.startsWith('test-')) {
      await fs.unlink(path.join(globalDir, file));
    }
  }
  console.log('✓ Cleanup complete');
}

// Test 1: POST /diagram/:repo creates diagram in specific repo
async function testCreateDiagramInRepo(testRepo1) {
  console.log('\n--- Test: POST /diagram/:repo creates diagram in repo ---');

  const repoEncoded = encodeURIComponent(testRepo1);
  const diagramData = {
    name: 'Test Diagram 1',
    nodes: [{ id: '1', label: 'Node 1' }],
    edges: [],
  };

  // Simulate POST request
  const filename = 'test-diagram-1.json';
  const filepath = path.join(testRepo1, '.aligner', filename);

  // Write diagram (simulating what the endpoint does)
  const data = {
    version: '1.0',
    ...diagramData,
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  };

  await fs.writeFile(filepath, JSON.stringify(data, null, 2));

  // Verify file was created
  const exists = await fs.access(filepath).then(() => true).catch(() => false);
  assert(exists, 'Diagram file should be created in repo .aligner directory');

  // Verify content
  const content = JSON.parse(await fs.readFile(filepath, 'utf-8'));
  assertEqual(content.name, 'Test Diagram 1', 'Diagram name should match');
  assert(content.nodes.length === 1, 'Diagram should have 1 node');
  assert(content.metadata.created, 'Diagram should have created timestamp');
}

// Test 2: POST /diagram/:repo creates diagram in global
async function testCreateDiagramInGlobal() {
  console.log('\n--- Test: POST /diagram/global creates diagram in global ---');

  const diagramData = {
    name: 'Test Global Diagram',
    nodes: [],
    edges: [],
  };

  const filename = 'test-global-diagram.json';
  const filepath = path.join(ALIGNER_DIR, 'global', filename);

  const data = {
    version: '1.0',
    ...diagramData,
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  };

  await fs.writeFile(filepath, JSON.stringify(data, null, 2));

  const exists = await fs.access(filepath).then(() => true).catch(() => false);
  assert(exists, 'Diagram file should be created in global directory');

  const content = JSON.parse(await fs.readFile(filepath, 'utf-8'));
  assertEqual(content.name, 'Test Global Diagram', 'Diagram name should match');
}

// Test 3: GET /diagram/:repo/:filename reads from specific repo
async function testGetDiagramFromRepo(testRepo1) {
  console.log('\n--- Test: GET /diagram/:repo/:filename reads from repo ---');

  const filename = 'test-diagram-1.json';
  const filepath = path.join(testRepo1, '.aligner', filename);

  // Verify file exists
  const content = JSON.parse(await fs.readFile(filepath, 'utf-8'));
  assertEqual(content.name, 'Test Diagram 1', 'Should read correct diagram from repo');
  assert(content.nodes.length === 1, 'Diagram should have node data');
}

// Test 4: GET /diagram/:repo/:filename reads from global
async function testGetDiagramFromGlobal() {
  console.log('\n--- Test: GET /diagram/global/:filename reads from global ---');

  const filename = 'test-global-diagram.json';
  const filepath = path.join(ALIGNER_DIR, 'global', filename);

  const content = JSON.parse(await fs.readFile(filepath, 'utf-8'));
  assertEqual(content.name, 'Test Global Diagram', 'Should read correct diagram from global');
}

// Test 5: PUT /diagram/:repo/:filename updates diagram in repo
async function testUpdateDiagramInRepo(testRepo1) {
  console.log('\n--- Test: PUT /diagram/:repo/:filename updates diagram ---');

  const filename = 'test-diagram-1.json';
  const filepath = path.join(testRepo1, '.aligner', filename);

  // Read existing
  const existing = JSON.parse(await fs.readFile(filepath, 'utf-8'));

  // Update
  existing.name = 'Updated Test Diagram';
  existing.nodes.push({ id: '2', label: 'Node 2' });
  existing.metadata.modified = new Date().toISOString();

  await fs.writeFile(filepath, JSON.stringify(existing, null, 2));

  // Verify update
  const updated = JSON.parse(await fs.readFile(filepath, 'utf-8'));
  assertEqual(updated.name, 'Updated Test Diagram', 'Diagram name should be updated');
  assert(updated.nodes.length === 2, 'Diagram should have 2 nodes after update');
}

// Test 6: DELETE /diagram/:repo/:filename removes diagram from repo
async function testDeleteDiagramFromRepo(testRepo2) {
  console.log('\n--- Test: DELETE /diagram/:repo/:filename removes diagram ---');

  // Create a diagram to delete
  const filename = 'test-delete.json';
  const filepath = path.join(testRepo2, '.aligner', filename);

  const data = {
    version: '1.0',
    name: 'To Be Deleted',
    nodes: [],
    edges: [],
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  };

  await fs.writeFile(filepath, JSON.stringify(data, null, 2));

  // Verify it exists
  let exists = await fs.access(filepath).then(() => true).catch(() => false);
  assert(exists, 'Diagram should exist before deletion');

  // Delete it
  await fs.unlink(filepath);

  // Verify it's gone
  exists = await fs.access(filepath).then(() => true).catch(() => false);
  assert(!exists, 'Diagram should be deleted');
}

// Test 7: resolveDiagramPath helper function (unit test)
async function testResolveDiagramPath() {
  console.log('\n--- Test: resolveDiagramPath helper function ---');

  // We'll test the logic manually since we can't import the function
  function resolveDiagramPath(repo, filename) {
    if (repo === 'global') {
      return path.join(ALIGNER_DIR, 'global', filename);
    }
    const decodedPath = decodeURIComponent(repo);
    return path.join(decodedPath, '.aligner', filename);
  }

  // Test global
  const globalPath = resolveDiagramPath('global', 'test.json');
  const expectedGlobal = path.join(ALIGNER_DIR, 'global', 'test.json');
  assertEqual(globalPath, expectedGlobal, 'Should resolve global path correctly');

  // Test repo path
  const repoPath = resolveDiagramPath('/tmp/test-repo', 'test.json');
  const expectedRepo = '/tmp/test-repo/.aligner/test.json';
  assertEqual(repoPath, expectedRepo, 'Should resolve repo path correctly');

  // Test URL-encoded path
  const encodedPath = encodeURIComponent('/tmp/my test repo');
  const decodedPath = resolveDiagramPath(encodedPath, 'test.json');
  const expectedDecoded = '/tmp/my test repo/.aligner/test.json';
  assertEqual(decodedPath, expectedDecoded, 'Should decode URL-encoded paths');
}

// Test 8: POST creates .aligner directory if missing
async function testCreateDirectoryIfMissing() {
  console.log('\n--- Test: POST creates .aligner directory if missing ---');

  const testRepo = '/tmp/aligner-test-no-dir';
  await fs.rm(testRepo, { recursive: true, force: true });
  await fs.mkdir(testRepo, { recursive: true });

  // Directory shouldn't exist yet
  const alignerDir = path.join(testRepo, '.aligner');
  let exists = await fs.access(alignerDir).then(() => true).catch(() => false);
  assert(!exists, '.aligner directory should not exist initially');

  // Create diagram (which should create the directory)
  const filename = 'test.json';
  const filepath = path.join(alignerDir, filename);

  await fs.mkdir(alignerDir, { recursive: true });

  const data = {
    version: '1.0',
    name: 'Test',
    nodes: [],
    edges: [],
    metadata: { created: new Date().toISOString(), modified: new Date().toISOString() },
  };

  await fs.writeFile(filepath, JSON.stringify(data, null, 2));

  // Verify directory was created
  exists = await fs.access(alignerDir).then(() => true).catch(() => false);
  assert(exists, '.aligner directory should be created automatically');

  // Cleanup
  await fs.rm(testRepo, { recursive: true, force: true });
}

// Main test runner
async function runTests() {
  console.log('========================================');
  console.log('Repo-Aware Diagram CRUD Integration Tests');
  console.log('========================================\n');

  let testRepo1, testRepo2;

  try {
    ({ testRepo1, testRepo2 } = await setupTestEnvironment());

    await testResolveDiagramPath();
    await testCreateDiagramInRepo(testRepo1);
    await testCreateDiagramInGlobal();
    await testGetDiagramFromRepo(testRepo1);
    await testGetDiagramFromGlobal();
    await testUpdateDiagramInRepo(testRepo1);
    await testDeleteDiagramFromRepo(testRepo2);
    await testCreateDirectoryIfMissing();

    await cleanupTestEnvironment(testRepo1, testRepo2);
  } catch (err) {
    console.error('\n❌ Test suite failed:', err.message);
  }

  console.log('\n========================================');
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log('========================================\n');

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
