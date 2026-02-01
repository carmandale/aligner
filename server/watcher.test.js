/**
 * Integration tests for DiagramWatcher
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { DiagramWatcher, createWatcher } from './watcher.js';

// Helper: create temporary test directory
async function createTempTestDir() {
  const tmpDir = path.join(os.tmpdir(), `aligner-watcher-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  return tmpDir;
}

// Helper: cleanup test directory
async function cleanup(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

// Helper: wait for event with timeout
function waitForEvent(emitter, eventName, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    emitter.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Helper: wait for specific time
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('DiagramWatcher - initialization', async () => {
  const watcher = new DiagramWatcher();
  assert.equal(watcher.watcher, null, 'Watcher should be null initially');
  assert.equal(watcher.watchedPaths.size, 0, 'Should have no watched paths');
});

test('DiagramWatcher - start with empty paths', async () => {
  const watcher = new DiagramWatcher();
  watcher.start([]);
  assert.equal(watcher.watcher, null, 'Watcher should not start with empty paths');
});

test('DiagramWatcher - detects new file', async (t) => {
  const testDir = await createTempTestDir();
  const alignerDir = path.join(testDir, '.aligner');
  await fs.mkdir(alignerDir, { recursive: true });

  const watcher = new DiagramWatcher();
  watcher.start([{ path: testDir, name: 'Test Repo' }]);

  // Wait for watcher to be ready
  await wait(200);

  // Create a new file and wait for 'add' event
  const testFile = path.join(alignerDir, 'test-diagram.json');
  const addPromise = waitForEvent(watcher, 'add');

  await fs.writeFile(testFile, JSON.stringify({ nodes: [], edges: [] }));

  const event = await addPromise;
  assert.equal(event.filename, 'test-diagram.json', 'Should detect correct filename');
  assert.ok(event.filePath.includes('.aligner'), 'Path should include .aligner');

  await watcher.stop();
  await cleanup(testDir);
});

test('DiagramWatcher - detects file change', async (t) => {
  const testDir = await createTempTestDir();
  const alignerDir = path.join(testDir, '.aligner');
  await fs.mkdir(alignerDir, { recursive: true });

  // Create initial file
  const testFile = path.join(alignerDir, 'existing-diagram.json');
  await fs.writeFile(testFile, JSON.stringify({ nodes: [], edges: [] }));

  const watcher = new DiagramWatcher();
  watcher.start([{ path: testDir, name: 'Test Repo' }]);

  // Wait for watcher to be ready
  await wait(200);

  // Modify the file and wait for 'change' event
  const changePromise = waitForEvent(watcher, 'change');
  await fs.writeFile(testFile, JSON.stringify({ nodes: [{ id: '1' }], edges: [] }));

  const event = await changePromise;
  assert.equal(event.filename, 'existing-diagram.json', 'Should detect correct filename');

  await watcher.stop();
  await cleanup(testDir);
});

test('DiagramWatcher - detects file deletion', async (t) => {
  const testDir = await createTempTestDir();
  const alignerDir = path.join(testDir, '.aligner');
  await fs.mkdir(alignerDir, { recursive: true });

  // Create initial file
  const testFile = path.join(alignerDir, 'to-delete.json');
  await fs.writeFile(testFile, JSON.stringify({ nodes: [], edges: [] }));

  const watcher = new DiagramWatcher();
  watcher.start([{ path: testDir, name: 'Test Repo' }]);

  // Wait for watcher to be ready
  await wait(200);

  // Delete the file and wait for 'unlink' event
  const unlinkPromise = waitForEvent(watcher, 'unlink');
  await fs.unlink(testFile);

  const event = await unlinkPromise;
  assert.equal(event.filename, 'to-delete.json', 'Should detect correct filename');

  await watcher.stop();
  await cleanup(testDir);
});

test('DiagramWatcher - ignores non-JSON files', async (t) => {
  const testDir = await createTempTestDir();
  const alignerDir = path.join(testDir, '.aligner');
  await fs.mkdir(alignerDir, { recursive: true });

  const watcher = new DiagramWatcher();
  let eventFired = false;

  watcher.on('add', () => {
    eventFired = true;
  });

  watcher.start([{ path: testDir, name: 'Test Repo' }]);

  // Wait for watcher to be ready
  await wait(200);

  // Create a non-JSON file
  const testFile = path.join(alignerDir, 'notes.txt');
  await fs.writeFile(testFile, 'some text');

  // Wait to ensure no event fires
  await wait(500);

  assert.equal(eventFired, false, 'Should not emit event for non-JSON files');

  await watcher.stop();
  await cleanup(testDir);
});

test('DiagramWatcher - addPath method', async (t) => {
  const testDir1 = await createTempTestDir();
  const testDir2 = await createTempTestDir();

  const alignerDir1 = path.join(testDir1, '.aligner');
  const alignerDir2 = path.join(testDir2, '.aligner');
  await fs.mkdir(alignerDir1, { recursive: true });
  await fs.mkdir(alignerDir2, { recursive: true });

  const watcher = new DiagramWatcher();
  watcher.start([{ path: testDir1, name: 'Repo 1' }]);

  // Wait for watcher to be ready
  await wait(200);

  assert.equal(watcher.watchedPaths.size, 1, 'Should have 1 watched path initially');

  // Add second path
  watcher.addPath(testDir2);
  await wait(200);

  assert.equal(watcher.watchedPaths.size, 2, 'Should have 2 watched paths after addPath');

  // Verify second path is watched by creating a file
  const testFile = path.join(alignerDir2, 'new-diagram.json');
  const addPromise = waitForEvent(watcher, 'add');
  await fs.writeFile(testFile, JSON.stringify({ nodes: [], edges: [] }));

  const event = await addPromise;
  assert.equal(event.filename, 'new-diagram.json', 'Should detect file in newly added path');

  await watcher.stop();
  await cleanup(testDir1);
  await cleanup(testDir2);
});

test('DiagramWatcher - removePath method', async (t) => {
  const testDir = await createTempTestDir();
  const alignerDir = path.join(testDir, '.aligner');
  await fs.mkdir(alignerDir, { recursive: true });

  const watcher = new DiagramWatcher();
  watcher.start([{ path: testDir, name: 'Test Repo' }]);

  // Wait for watcher to be ready
  await wait(200);

  assert.equal(watcher.watchedPaths.size, 1, 'Should have 1 watched path initially');

  // Remove path
  watcher.removePath(testDir);
  await wait(200);

  assert.equal(watcher.watchedPaths.size, 0, 'Should have 0 watched paths after removePath');

  // Verify path is no longer watched
  let eventFired = false;
  watcher.on('add', () => {
    eventFired = true;
  });

  const testFile = path.join(alignerDir, 'ignored.json');
  await fs.writeFile(testFile, JSON.stringify({ nodes: [], edges: [] }));
  await wait(500);

  assert.equal(eventFired, false, 'Should not detect file after path removed');

  await watcher.stop();
  await cleanup(testDir);
});

test('DiagramWatcher - watches multiple repos', async (t) => {
  const testDir1 = await createTempTestDir();
  const testDir2 = await createTempTestDir();

  const alignerDir1 = path.join(testDir1, '.aligner');
  const alignerDir2 = path.join(testDir2, '.aligner');
  await fs.mkdir(alignerDir1, { recursive: true });
  await fs.mkdir(alignerDir2, { recursive: true });

  const watcher = new DiagramWatcher();
  watcher.start([
    { path: testDir1, name: 'Repo 1' },
    { path: testDir2, name: 'Repo 2' }
  ]);

  // Wait for watcher to be ready
  await wait(200);

  assert.equal(watcher.watchedPaths.size, 2, 'Should watch both repos');

  // Test file creation in first repo
  const testFile1 = path.join(alignerDir1, 'diagram1.json');
  const add1Promise = waitForEvent(watcher, 'add');
  await fs.writeFile(testFile1, JSON.stringify({ nodes: [], edges: [] }));
  const event1 = await add1Promise;
  assert.equal(event1.filename, 'diagram1.json', 'Should detect file in first repo');

  // Test file creation in second repo
  const testFile2 = path.join(alignerDir2, 'diagram2.json');
  const add2Promise = waitForEvent(watcher, 'add');
  await fs.writeFile(testFile2, JSON.stringify({ nodes: [], edges: [] }));
  const event2 = await add2Promise;
  assert.equal(event2.filename, 'diagram2.json', 'Should detect file in second repo');

  await watcher.stop();
  await cleanup(testDir1);
  await cleanup(testDir2);
});

test('createWatcher - factory function', async () => {
  const testDir = await createTempTestDir();
  const alignerDir = path.join(testDir, '.aligner');
  await fs.mkdir(alignerDir, { recursive: true });

  const watcher = createWatcher([{ path: testDir, name: 'Test Repo' }]);

  assert.ok(watcher instanceof DiagramWatcher, 'Should return DiagramWatcher instance');
  assert.equal(watcher.watchedPaths.size, 1, 'Should have started watching');

  await watcher.stop();
  await cleanup(testDir);
});

test('createWatcher - with empty array', async () => {
  const watcher = createWatcher([]);

  assert.ok(watcher instanceof DiagramWatcher, 'Should return DiagramWatcher instance');
  assert.equal(watcher.watcher, null, 'Should not start watcher with empty array');
});
