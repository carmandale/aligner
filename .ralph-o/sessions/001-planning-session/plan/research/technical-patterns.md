# Technical Implementation Research

## 1. File Watching with Chokidar

**Source:** [Chokidar GitHub](https://github.com/paulmillr/chokidar)

### Key Findings

- **v5 (Nov 2025)**: ESM-only, requires Node.js v20+
- **v4 (Sep 2024)**: Removed glob support, reduced dependencies from 13 to 1

### Watching Multiple Directories

```javascript
import chokidar from 'chokidar'

// Watch multiple paths
const watcher = chokidar.watch([
  '/path/to/repo1/.aligner',
  '/path/to/repo2/.aligner',
  '~/.aligner/global'
])

// Can add more paths dynamically
watcher.add('/path/to/new-repo/.aligner')

// Remove paths
watcher.unwatch('/path/to/old-repo/.aligner')
```

### Best Practices

1. **Limit depth** - Use `depth: 0` since we only need `.aligner/` root
2. **Be judicious** - Don't watch more than needed (resource intensive)
3. **awaitWriteFinish** - For large files being written
4. **Graceful handling** - Handle EMFILE errors on systems with many watchers

### Recommended Config for Aligner

```javascript
chokidar.watch(alignerPaths, {
  depth: 0,                    // Only watch immediate children
  ignoreInitial: true,         // Don't fire on startup scan
  awaitWriteFinish: {          // Wait for large files
    stabilityThreshold: 100,
    pollInterval: 50
  }
})
```

## 2. Path Encoding in REST APIs

### Problem

Repo paths like `/Users/dale/dev/orchestrator` need to be used in URLs.

### Solutions

1. **URL-safe encoding** (recommended)
   ```javascript
   const encodedPath = encodeURIComponent('/Users/dale/dev/orchestrator')
   // Result: %2FUsers%2Fdale%2Fdev%2Forchestrator

   // In Express route
   app.get('/diagram/:repo/:filename', (req, res) => {
     const repoPath = decodeURIComponent(req.params.repo)
   })
   ```

2. **Special "global" keyword**
   ```javascript
   // GET /diagram/global/scratch.json → ~/.aligner/global/scratch.json
   // GET /diagram/%2FUsers%2Fdale%2Fdev%2Fmy-repo/flow.json → repo's .aligner/
   ```

3. **Base64 encoding** (alternative)
   ```javascript
   const encoded = Buffer.from(path).toString('base64url')
   ```

### Recommendation

Use `encodeURIComponent` with special handling for "global":
```javascript
function getRepoPath(param) {
  if (param === 'global') return path.join(homedir(), '.aligner', 'global')
  return decodeURIComponent(param)
}
```

## 3. Registry Persistence

### Option A: JSON File (Recommended for Aligner)

```javascript
// ~/.aligner/registry.json
{
  "version": "1.0",
  "repos": [
    { "path": "/Users/dale/dev/orchestrator", "name": "Orchestrator" }
  ]
}
```

**Pros:** Simple, human-readable, easy to edit
**Cons:** No atomic writes (risk of corruption on crash)

**Mitigation:** Write-and-rename pattern:
```javascript
async function saveRegistry(data) {
  const tmp = `${REGISTRY_PATH}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2))
  await fs.rename(tmp, REGISTRY_PATH)  // Atomic on POSIX
}
```

### Option B: SQLite (Overkill for this use case)

Better for complex queries, but adds dependency and complexity.

## 4. Migration Strategy

### Safe Migration Pattern

```javascript
async function migrateToV2() {
  const globalDir = path.join(ALIGNER_DIR, 'global')
  await fs.mkdir(globalDir, { recursive: true })

  const files = await fs.readdir(ALIGNER_DIR)
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    if (file === 'registry.json') continue

    const src = path.join(ALIGNER_DIR, file)
    const dest = path.join(globalDir, file)

    // Only move if not already in global
    try {
      await fs.access(dest)
      // Already exists in global, skip
    } catch {
      await fs.rename(src, dest)
      console.log(`Migrated ${file} to global/`)
    }
  }
}
```

### Rollback Support

Keep old files for one version cycle:
```javascript
// Instead of fs.rename, use fs.copyFile
// Add cleanup in future version
```
