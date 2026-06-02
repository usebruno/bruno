# @usebruno/pool

A small `worker_threads` pool for running CPU-bound Bruno jobs off the main thread. It's a thin wrapper over [workerpool](https://github.com/josdejong/workerpool): the queue, worker bookkeeping, and crash recovery are handled by workerpool, while this package adds a typed, job-aware API.

Workers are spawned lazily — constructing a pool costs nothing; the first `run()` spawns the first worker, growing up to `size` workers on demand. No native dependencies.

## How it works

Each job is a script under `src/scripts/` that default-exports a handler function. The worker (`src/worker.ts`) registers every job as a named method, keyed by a `JobType` constant. `pool.run(type, args)` invokes the matching handler in a worker thread and resolves with its return value (or rejects with the error it threw).

```
Pool.run(type, args)  ──►  workerpool queue  ──►  worker method[type](args)  ──►  result
```

## Usage

Most callers should use the shared, app-lifecycle pool via `getPool()`. It's a lazy singleton: the first call creates the pool object, the first `run()` spawns workers, and one pool is shared across every job type and consumer (keeping total CPU bounded).

```ts
import { getPool, destroyPool, JobType } from '@usebruno/pool';

const result = await getPool().run(JobType.ParseFile, {
  collectionPath: '/path/to/collection',
  relativePath: 'request.bru',
  format: 'bru',
  type: 'request'
});

// On app shutdown, terminate the shared pool's workers.
await destroyPool();
```

Use the `JobType` constants instead of raw strings so call sites get autocomplete and type-checking. The package is published as CommonJS, so it works under both Electron/Node and Jest:

```js
const { getPool, JobType } = require('@usebruno/pool');
```

If you need an isolated pool (e.g. a differently-sized pool for a special job, or per-test isolation), construct one directly and own its lifecycle:

```ts
import { Pool, JobType } from '@usebruno/pool';

const pool = new Pool({ size: 2 });
await pool.run(JobType.ParseFile, { /* ... */ });
await pool.destroy();
```

## API

### `getPool(options?): Pool`

Returns the shared singleton pool, creating it on first call. `options` only take effect on that first call; later calls return the existing instance and ignore their args.

### `destroyPool(): Promise<void>`

Terminates the shared pool's workers and clears the singleton. A subsequent `getPool()` creates a fresh one.

### `new Pool(options?)`

Creates an isolated pool you own.

| Option | Type     | Default                       | Description                      |
| ------ | -------- | ----------------------------- | -------------------------------- |
| `size` | `number` | `os.availableParallelism()`   | Max worker threads (spawned lazily). |

### `pool.run<T>(type, args?): Promise<T>`

Runs the job named `type` (a `JobType` value) with `args`, resolving with the handler's result. Rejects if the handler throws.

### `pool.destroy(): Promise<void>`

Terminates all workers; in-flight and queued jobs reject.

### `JobType`

A const map of available jobs (e.g. `JobType.ParseFile`). Each value is the worker method name.

## Adding a job

1. Create `src/scripts/<job>.ts` with a default-exported handler function.
2. Add an entry to `JobType` in `src/pool.ts`.
3. Register it in `src/worker.ts`: `[JobType.<Job>]: <handler>`.

## Build

```sh
npm run build   # rollup bundle + tsc declarations
```
