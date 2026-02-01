/**
 * Unit tests for Registry Manager
 * Run with: node server/registry.test.js
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import {
  loadRegistry,
  saveRegistry,
  registerRepo,
  unregisterRepo,
  getAlignerDir
} from './registry.js';

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

async function cleanupTestFiles() {
  const testDir = path.join(homedir(), '.aligner-test');
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// Override the registry path for testing
const originalHomedir = homedir();
const TEST_HOMEDIR = path.join(originalHomedir, '.aligner-test');

// We'll use a test directory instead of mocking
async function setupTestEnv() {
  await cleanupTestFiles();
  await fs.mkdir(TEST_HOMEDIR, { recursive: true });
  // Temporarily change homedir for tests - we'll need to patch the module
}

// Tests

async function testLoadRegistry_FileExists() {
  console.log('\n--- Test: loadRegistry - File Exists ---');
  await setupTestEnv();

  const testRegistry = {
    version: '1.0',
    repos: [
      {
        path: '/test/repo',
        name: 'Test Repo',
        addedAt: '2024-01-30T12:00:00Z'
      }
    ]
  };

  // Create test registry file
  const registryPath = path.join(TEST_HOMEDIR, '.aligner', 'registry.json');
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(testRegistry));

  // Note: This test requires mocking homedir which is complex without a test framework
  console.log('⚠️  SKIP: Requires homedir mocking');
}

async function testGetAlignerDir_Global() {
  console.log('\n--- Test: getAlignerDir - Global ---');

  const result = getAlignerDir('global');
  const expected = path.join(homedir(), '.aligner', 'global');

  assertEqual(result, expected, 'getAlignerDir("global") returns correct path');
}

async function testGetAlignerDir_Null() {
  console.log('\n--- Test: getAlignerDir - Null ---');

  const result = getAlignerDir(null);
  const expected = path.join(homedir(), '.aligner', 'global');

  assertEqual(result, expected, 'getAlignerDir(null) returns global path');
}

async function testGetAlignerDir_RepoPath() {
  console.log('\n--- Test: getAlignerDir - Repo Path ---');

  const repoPath = '/Users/testuser/dev/myrepo';
  const result = getAlignerDir(repoPath);
  const expected = path.join(repoPath, '.aligner');

  assertEqual(result, expected, 'getAlignerDir(repoPath) returns repo-local path');
}

async function testIntegration_FullWorkflow() {
  console.log('\n--- Integration Test: Full Registry Workflow ---');

  try {
    // Test 1: Load empty registry (file doesn't exist)
    await cleanupTestFiles();
    const registry1 = await loadRegistry();
    assert(registry1.version === '1.0', 'Empty registry has version 1.0');
    assert(Array.isArray(registry1.repos), 'Empty registry has repos array');
    assert(registry1.repos.length === 0, 'Empty registry repos array is empty');

    // Test 2: Register a repo
    const testRepo1 = '/tmp/test-repo-1';
    const repo1 = await registerRepo(testRepo1, 'Test Repo 1');
    assert(repo1.path === testRepo1, 'Registered repo has correct path');
    assert(repo1.name === 'Test Repo 1', 'Registered repo has correct name');
    assert(repo1.addedAt, 'Registered repo has addedAt timestamp');

    // Test 3: Load registry and verify repo was saved
    const registry2 = await loadRegistry();
    assert(registry2.repos.length === 1, 'Registry contains one repo');
    assert(registry2.repos[0].path === testRepo1, 'Loaded repo has correct path');

    // Test 4: Register same repo again (idempotent)
    const repo1Again = await registerRepo(testRepo1, 'Different Name');
    assert(repo1Again.path === testRepo1, 'Idempotent register returns same path');
    assert(repo1Again.name === 'Test Repo 1', 'Idempotent register keeps original name');

    const registry3 = await loadRegistry();
    assert(registry3.repos.length === 1, 'Registry still has only one repo after duplicate register');

    // Test 5: Register another repo with default name
    const testRepo2 = '/tmp/my-awesome-repo';
    const repo2 = await registerRepo(testRepo2);
    assert(repo2.name === 'my-awesome-repo', 'Default name is directory basename');

    const registry4 = await loadRegistry();
    assert(registry4.repos.length === 2, 'Registry now has two repos');

    // Test 6: Unregister first repo
    await unregisterRepo(testRepo1);
    const registry5 = await loadRegistry();
    assert(registry5.repos.length === 1, 'Registry has one repo after unregister');
    assert(registry5.repos[0].path === testRepo2, 'Remaining repo is the correct one');

    // Test 7: Unregister non-existent repo (should not error)
    await unregisterRepo('/nonexistent/repo');
    const registry6 = await loadRegistry();
    assert(registry6.repos.length === 1, 'Registry unchanged after unregistering nonexistent repo');

    console.log('\n✅ All integration tests passed!');

  } catch (err) {
    console.error('\n❌ Integration test failed:', err.message);
    throw err;
  } finally {
    await cleanupTestFiles();
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Running Registry Manager Tests...\n');

  try {
    await testGetAlignerDir_Global();
    await testGetAlignerDir_Null();
    await testGetAlignerDir_RepoPath();
    await testIntegration_FullWorkflow();

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ ${testsPassed} tests passed`);
    console.log(`❌ ${testsFailed} tests failed`);
    console.log('='.repeat(50));

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  }
}

runTests();
