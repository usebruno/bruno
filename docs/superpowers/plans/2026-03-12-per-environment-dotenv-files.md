# Per-Environment .env File Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to have per-environment `.env` files (e.g., `environments/stage.env`) whose variables are loaded when that environment is selected, supplementing the `.yml` environment variables.

**Architecture:** Extend the existing dotenv-watcher to also watch the workspace `environments/` directory for `{envName}.env` files. When a global environment is selected, find the matching `.env` file and merge its variables into the environment. The dotenv variables override `.yml` values, giving users a git-ignored place to store secrets per environment.

**Tech Stack:** Node.js, Electron IPC, chokidar (file watching), Redux (frontend state)

**Closes:** [#7217](https://github.com/usebruno/bruno/issues/7217), [#409](https://github.com/usebruno/bruno/issues/409)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `packages/bruno-electron/src/store/process-env.js` | Add per-environment dotenv storage |
| Modify | `packages/bruno-electron/src/app/dotenv-watcher.js` | Watch `environments/` dir for `{name}.env` files |
| Modify | `packages/bruno-electron/src/store/workspace-environments.js` | Merge env-specific dotenv vars into environment on load |
| Modify | `packages/bruno-electron/src/ipc/global-environments.js` | Pass env dotenv vars to renderer on environment select |
| Modify | `packages/bruno-electron/src/ipc/network/index.js` | Merge env dotenv vars into request execution |
| Modify | `packages/bruno-app/src/providers/App/useIpcEvents.js` | Handle new `environment-dotenv` event type |
| Modify | `packages/bruno-app/src/providers/ReduxStore/slices/workspaces/actions.js` | Add action for environment dotenv vars |
| Create | `packages/bruno-electron/tests/utils/per-env-dotenv.spec.js` | Tests for the new feature |

---

## Chunk 1: Backend Storage & File Watching

### Task 1: Add per-environment dotenv storage to process-env.js

**Files:**
- Modify: `packages/bruno-electron/src/store/process-env.js`

- [ ] **Step 1: Add environment-specific dotenv storage**

Add a new store and accessors for per-environment dotenv variables:

```js
// Add after line 3 (after collectionWorkspaceMap)
const environmentDotEnvVars = {};

// Add new functions before module.exports
const setEnvironmentDotEnvVars = (workspacePath, environmentName, data) => {
  const key = `${workspacePath}::${environmentName}`;
  environmentDotEnvVars[key] = data;
};

const getEnvironmentDotEnvVars = (workspacePath, environmentName) => {
  const key = `${workspacePath}::${environmentName}`;
  return environmentDotEnvVars[key] || {};
};

const clearEnvironmentDotEnvVars = (workspacePath, environmentName) => {
  if (environmentName) {
    const key = `${workspacePath}::${environmentName}`;
    delete environmentDotEnvVars[key];
  } else {
    // Clear all env dotenvs for this workspace
    const prefix = `${workspacePath}::`;
    Object.keys(environmentDotEnvVars).forEach((key) => {
      if (key.startsWith(prefix)) {
        delete environmentDotEnvVars[key];
      }
    });
  }
};
```

Add to `module.exports`:
```js
setEnvironmentDotEnvVars,
getEnvironmentDotEnvVars,
clearEnvironmentDotEnvVars
```

- [ ] **Step 2: Commit**

```bash
git add packages/bruno-electron/src/store/process-env.js
git commit -m "feat: add per-environment dotenv storage to process-env"
```

---

### Task 2: Extend dotenv-watcher to watch environments/ directory

**Files:**
- Modify: `packages/bruno-electron/src/app/dotenv-watcher.js`

- [ ] **Step 1: Add environment dotenv file detection**

Add helper function after `isDotEnvFile` (line 9):

```js
const isEnvironmentDotEnvFile = (filename) => {
  return filename.endsWith('.env') && filename !== '.env' && !filename.startsWith('.env.');
};
```

- [ ] **Step 2: Import new process-env functions**

Update imports at line 4:

```js
const {
  setDotEnvVars, clearDotEnvVars,
  setWorkspaceDotEnvVars, clearWorkspaceDotEnvVars,
  setEnvironmentDotEnvVars, clearEnvironmentDotEnvVars
} = require('../store/process-env');
```

- [ ] **Step 3: Add environment dotenv file handler**

Add new handler factory after `createUnlinkHandler` (after line 90):

```js
const createEnvironmentFileHandler = (win, options) => (pathname) => {
  const { workspacePath, workspaceUid } = options;
  const filename = path.basename(pathname);

  if (!isEnvironmentDotEnvFile(filename)) {
    return;
  }

  const environmentName = filename.slice(0, -'.env'.length);

  try {
    const content = fs.readFileSync(pathname, 'utf8');
    const jsonData = parseDotEnv(content);

    setEnvironmentDotEnvVars(workspacePath, environmentName, jsonData);

    const variables = parseVariablesToArray(jsonData);

    if (!win.isDestroyed()) {
      win.webContents.send('main:environment-dotenv-file-update', {
        workspaceUid,
        workspacePath,
        environmentName,
        filename,
        variables,
        exists: true
      });
    }
  } catch (err) {
    console.error(`Error processing environment dotenv file ${pathname}:`, err);
  }
};

const createEnvironmentUnlinkHandler = (win, options) => (pathname) => {
  const { workspacePath, workspaceUid } = options;
  const filename = path.basename(pathname);

  if (!isEnvironmentDotEnvFile(filename)) {
    return;
  }

  const environmentName = filename.slice(0, -'.env'.length);
  clearEnvironmentDotEnvVars(workspacePath, environmentName);

  if (!win.isDestroyed()) {
    win.webContents.send('main:environment-dotenv-file-update', {
      workspaceUid,
      workspacePath,
      environmentName,
      filename,
      variables: [],
      exists: false
    });
  }
};
```

- [ ] **Step 4: Add environment dotenv watcher to workspace watcher**

In the `addWorkspaceWatcher` method (line 148), after creating the workspace-level watcher, add a separate watcher for the `environments/` subdirectory:

```js
// Add after line 191 (after this.workspaceWatchers.set)

// Watch environments/ directory for per-environment .env files
const environmentsDir = path.join(workspacePath, 'environments');
if (fs.existsSync(environmentsDir)) {
  const envDotEnvWatcher = chokidar.watch(environmentsDir, {
    ...DEFAULT_WATCHER_OPTIONS,
    disableGlobbing: true,
    awaitWriteFinish: {
      stabilityThreshold: 80,
      pollInterval: 250
    }
  });

  const handleEnvFile = createEnvironmentFileHandler(win, {
    workspacePath,
    workspaceUid
  });
  const handleEnvUnlink = createEnvironmentUnlinkHandler(win, {
    workspacePath,
    workspaceUid
  });

  envDotEnvWatcher.on('add', handleEnvFile);
  envDotEnvWatcher.on('change', handleEnvFile);
  envDotEnvWatcher.on('unlink', handleEnvUnlink);
  envDotEnvWatcher.on('error', (err) => {
    console.error(`Environment dotenv watcher error for ${environmentsDir}:`, err);
  });

  this.environmentWatchers.set(workspacePath, envDotEnvWatcher);
}
```

- [ ] **Step 5: Add environmentWatchers Map to constructor**

In the constructor (line 93), add:

```js
this.environmentWatchers = new Map();
```

- [ ] **Step 6: Update closeAll to close environment watchers**

In `closeAll()` (line 197), add:

```js
for (const [path, watcher] of this.environmentWatchers) {
  watcher.close();
}
this.environmentWatchers.clear();
```

- [ ] **Step 7: Update removeWorkspaceWatcher to clean up env watcher**

In `removeWorkspaceWatcher` (line 185), add:

```js
if (this.environmentWatchers.has(workspacePath)) {
  this.environmentWatchers.get(workspacePath).close();
  this.environmentWatchers.delete(workspacePath);
}
clearEnvironmentDotEnvVars(workspacePath);
```

- [ ] **Step 8: Commit**

```bash
git add packages/bruno-electron/src/app/dotenv-watcher.js
git commit -m "feat: extend dotenv-watcher to watch environments/ for per-env .env files"
```

---

## Chunk 2: Request Execution Integration

### Task 3: Merge environment dotenv vars into request execution

**Files:**
- Modify: `packages/bruno-electron/src/ipc/network/index.js`

- [ ] **Step 1: Import getEnvironmentDotEnvVars**

Add to existing imports from process-env (find the existing `getProcessEnvVars` import):

```js
const { getProcessEnvVars, getEnvironmentDotEnvVars } = require('../../store/process-env');
```

- [ ] **Step 2: Merge env dotenv vars in request handler**

At line 361 (in the `send-http-request` handler), after `const envVars = getEnvVars(environment);`, add:

```js
// Merge per-environment dotenv variables (override .yml env vars)
const workspacePath = collection.workspacePath;
const envDotEnvVars = workspacePath && environment?.name
  ? getEnvironmentDotEnvVars(workspacePath, environment.name)
  : {};
Object.assign(envVars, envDotEnvVars);
```

Find all other places where `getEnvVars(environment)` is called in this file and apply the same pattern. Based on the grep results, these are around lines 361, 1180, and 1254.

- [ ] **Step 3: Do the same for the GraphQL schema fetch handler**

At line 361 (in `fetchGqlSchemaHandler`), apply same merge after `const envVars = getEnvVars(environment);`

- [ ] **Step 4: Commit**

```bash
git add packages/bruno-electron/src/ipc/network/index.js
git commit -m "feat: merge per-environment dotenv vars into request execution"
```

---

### Task 4: Handle environment dotenv events in the renderer

**Files:**
- Modify: `packages/bruno-app/src/providers/App/useIpcEvents.js`

- [ ] **Step 1: Add listener for environment-dotenv-file-update**

After the `main:dotenv-file-update` listener (around line 256), add:

```js
const removeEnvironmentDotEnvListener = ipcRenderer.on('main:environment-dotenv-file-update', (val) => {
  const { workspaceUid, environmentName, variables, exists, filename } = val;
  // Store in redux for UI display (optional - variables are already in process-env on backend)
  if (workspaceUid) {
    dispatch(setEnvironmentDotEnvVariables({
      workspaceUid,
      environmentName,
      variables,
      exists,
      filename
    }));
  }
});
```

Add cleanup in the return function:

```js
removeEnvironmentDotEnvListener();
```

- [ ] **Step 2: Add Redux action for environment dotenv variables**

In `packages/bruno-app/src/providers/ReduxStore/slices/workspaces/actions.js`, add the action. This stores per-environment dotenv state in Redux so the UI can show which variables come from `.env` files.

Check existing patterns for `setDotEnvVariables` and `setWorkspaceDotEnvVariables` in the workspaces slice, and follow the same pattern for `setEnvironmentDotEnvVariables`.

- [ ] **Step 3: Commit**

```bash
git add packages/bruno-app/src/providers/App/useIpcEvents.js
git add packages/bruno-app/src/providers/ReduxStore/slices/workspaces/
git commit -m "feat: handle per-environment dotenv events in renderer"
```

---

## Chunk 3: CLI Support

### Task 5: Support per-environment .env files in CLI

**Files:**
- Modify: `packages/bruno-cli/src/commands/run.js`

- [ ] **Step 1: Check how CLI currently loads environments**

Read `packages/bruno-cli/src/commands/run.js` and find where environments are loaded and variables resolved. The CLI needs to also check for `environments/{envName}.env` and merge those vars.

- [ ] **Step 2: Add .env file loading for selected environment**

After the environment `.yml` file is parsed, check for a matching `.env` file:

```js
const envDotEnvPath = path.join(environmentsDir, `${environmentName}.env`);
if (fs.existsSync(envDotEnvPath)) {
  const dotEnvContent = fs.readFileSync(envDotEnvPath, 'utf8');
  const dotEnvVars = parseDotEnv(dotEnvContent);
  // Merge into environment variables (dotenv overrides yml)
  Object.entries(dotEnvVars).forEach(([key, value]) => {
    const existing = environment.variables.find(v => v.name === key);
    if (existing) {
      existing.value = value;
    } else {
      environment.variables.push({ name: key, value, enabled: true, secret: false });
    }
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/bruno-cli/src/commands/run.js
git commit -m "feat: support per-environment .env files in CLI"
```

---

## Chunk 4: Tests & Documentation

### Task 6: Add tests

**Files:**
- Create: `packages/bruno-electron/tests/utils/per-env-dotenv.spec.js`

- [ ] **Step 1: Write tests for process-env storage**

```js
const {
  setEnvironmentDotEnvVars,
  getEnvironmentDotEnvVars,
  clearEnvironmentDotEnvVars
} = require('../../src/store/process-env');

describe('Per-environment dotenv storage', () => {
  afterEach(() => {
    clearEnvironmentDotEnvVars('/workspace');
  });

  it('should store and retrieve environment dotenv vars', () => {
    setEnvironmentDotEnvVars('/workspace', 'stage', { SECRET: 'abc' });
    expect(getEnvironmentDotEnvVars('/workspace', 'stage')).toEqual({ SECRET: 'abc' });
  });

  it('should return empty object for unknown environment', () => {
    expect(getEnvironmentDotEnvVars('/workspace', 'unknown')).toEqual({});
  });

  it('should clear specific environment', () => {
    setEnvironmentDotEnvVars('/workspace', 'stage', { A: '1' });
    setEnvironmentDotEnvVars('/workspace', 'prod', { B: '2' });
    clearEnvironmentDotEnvVars('/workspace', 'stage');
    expect(getEnvironmentDotEnvVars('/workspace', 'stage')).toEqual({});
    expect(getEnvironmentDotEnvVars('/workspace', 'prod')).toEqual({ B: '2' });
  });

  it('should clear all environments for workspace', () => {
    setEnvironmentDotEnvVars('/workspace', 'stage', { A: '1' });
    setEnvironmentDotEnvVars('/workspace', 'prod', { B: '2' });
    clearEnvironmentDotEnvVars('/workspace');
    expect(getEnvironmentDotEnvVars('/workspace', 'stage')).toEqual({});
    expect(getEnvironmentDotEnvVars('/workspace', 'prod')).toEqual({});
  });
});
```

- [ ] **Step 2: Write tests for environment dotenv file detection**

```js
// Test isEnvironmentDotEnvFile
describe('isEnvironmentDotEnvFile', () => {
  it('should match stage.env', () => expect(isEnvironmentDotEnvFile('stage.env')).toBe(true));
  it('should match local.env', () => expect(isEnvironmentDotEnvFile('local.env')).toBe(true));
  it('should not match .env', () => expect(isEnvironmentDotEnvFile('.env')).toBe(false));
  it('should not match .env.local', () => expect(isEnvironmentDotEnvFile('.env.local')).toBe(false));
  it('should not match stage.yml', () => expect(isEnvironmentDotEnvFile('stage.yml')).toBe(false));
});
```

- [ ] **Step 3: Run tests**

```bash
cd packages/bruno-electron && npm test
```

- [ ] **Step 4: Commit**

```bash
git add packages/bruno-electron/tests/
git commit -m "test: add tests for per-environment dotenv support"
```

---

### Task 7: Final commit and PR preparation

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

- [ ] **Step 2: Create PR**

Title: `feat: support per-environment .env files (#7217)`

Description should reference:
- Closes #7217
- Closes #409
- Explain the feature: `environments/{envName}.env` files loaded when environment is selected
- Variables from `.env` override `.yml` environment values
- Supported in both desktop app and CLI
- Zero impact on users without per-environment `.env` files
