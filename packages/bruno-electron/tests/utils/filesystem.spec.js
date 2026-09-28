const { withFileLock } = require('../../src/utils/filesystem');

// Manual-gate helper: returns a Promise + a `resolve` function. Tests use this
// to deterministically interleave two async operations through withFileLock —
// without it, racing setTimeouts make the test flaky.
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Drain the entire microtask queue. withFileLock chains `.catch().then(() => fn())`,
// so fn() starts two microtask hops after the synchronous call — a single
// `await Promise.resolve()` isn't enough. setImmediate runs after all queued
// microtasks resolve, giving us a clean barrier.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('withFileLock', () => {
  test('serializes two concurrent ops on the same path in queued order', async () => {
    const events = [];
    const gateA = deferred();
    const gateB = deferred();

    const opA = withFileLock('/p/one', async () => {
      events.push('A:start');
      await gateA.promise;
      events.push('A:end');
      return 'A';
    });

    // Start B while A is still inside its critical section. B must NOT start
    // until A resolves — that's the whole point of the lock.
    const opB = withFileLock('/p/one', async () => {
      events.push('B:start');
      await gateB.promise;
      events.push('B:end');
      return 'B';
    });

    // Let microtasks settle. A should have started but B must still be queued.
    await flush();
    expect(events).toEqual(['A:start']);

    // Open A's gate first; B's start should follow.
    gateA.resolve();
    await flush();
    expect(events).toEqual(['A:start', 'A:end', 'B:start']);

    gateB.resolve();

    const [a, b] = await Promise.all([opA, opB]);
    expect(a).toBe('A');
    expect(b).toBe('B');
    expect(events).toEqual(['A:start', 'A:end', 'B:start', 'B:end']);
  });

  test('different paths run concurrently (lock is per-path)', async () => {
    const events = [];
    const gateA = deferred();
    const gateB = deferred();

    const opA = withFileLock('/p/one', async () => {
      events.push('A:start');
      await gateA.promise;
      events.push('A:end');
    });

    const opB = withFileLock('/p/two', async () => {
      events.push('B:start');
      await gateB.promise;
      events.push('B:end');
    });

    // Both should be inside their critical sections concurrently.
    await flush();
    expect(events.sort()).toEqual(['A:start', 'B:start']);

    // Resolve in reverse order to demonstrate true independence — B finishes
    // before A despite starting in a separate concurrent path.
    gateB.resolve();
    await opB;
    expect(events).toContain('B:end');
    expect(events).not.toContain('A:end');

    gateA.resolve();
    await opA;
    expect(events).toContain('A:end');
  });

  test('an error in op A does NOT block op B on the same path', async () => {
    // Pre-fix: if `prior` rejected, `prior.then(...)` would also reject, leaking
    // an unhandled rejection AND propagating B's chain to a rejected state before
    // its own fn ran. The `.catch(() => {})` on `prior` is what makes B independent.
    const opA = withFileLock('/p/lock-err', async () => {
      throw new Error('boom');
    });

    const opB = withFileLock('/p/lock-err', async () => {
      return 'B-completed';
    });

    await expect(opA).rejects.toThrow('boom');
    await expect(opB).resolves.toBe('B-completed');
  });

  test('subsequent ops on a path after the queue drains start a fresh chain', async () => {
    // Regression guard: the cleanup `if (_pathLocks.get(pathname) === next) delete`
    // must remove the entry when the queue drains, so a later op on the same path
    // doesn't chain off a stale (already-settled) promise. If it did, the new op
    // would still run — but the lock would leak one Map entry per saved file.
    const order = [];

    await withFileLock('/p/drained', async () => {
      order.push('first');
    });
    await withFileLock('/p/drained', async () => {
      order.push('second');
    });

    expect(order).toEqual(['first', 'second']);
  });

  test('three concurrent ops on the same path execute strictly in queued order', async () => {
    // Smoke test for the rapid-fire scripted-write scenario: a folder run
    // emitting bru.setEnvVar(..., persist:true) on each of 3 back-to-back requests.
    const events = [];
    const gates = [deferred(), deferred(), deferred()];

    const ops = gates.map((g, i) =>
      withFileLock('/p/triple', async () => {
        events.push(`op-${i}:start`);
        await g.promise;
        events.push(`op-${i}:end`);
      })
    );

    await flush();
    expect(events).toEqual(['op-0:start']);

    gates[0].resolve();
    await flush();
    expect(events).toEqual(['op-0:start', 'op-0:end', 'op-1:start']);

    gates[1].resolve();
    await flush();
    expect(events).toEqual(['op-0:start', 'op-0:end', 'op-1:start', 'op-1:end', 'op-2:start']);

    gates[2].resolve();
    await Promise.all(ops);
    expect(events).toEqual([
      'op-0:start', 'op-0:end',
      'op-1:start', 'op-1:end',
      'op-2:start', 'op-2:end'
    ]);
  });

  test('the inner fn sees post-prior-write state (read-modify-write safety)', async () => {
    // The reason the lock exists. Simulate the env-save read-then-write pattern:
    // two writers both read the "file," compute new content, then write. Without
    // the lock the second writer's read would capture pre-first-write state and
    // overwrite the first writer's update.
    let onDisk = '0';

    const write = (newContent) =>
      withFileLock('/p/rmw', async () => {
        const existing = onDisk; // "read"
        const merged = `${existing}+${newContent}`;
        // Simulate a small async cost between read and write.
        await new Promise((r) => setImmediate(r));
        onDisk = merged; // "write"
      });

    // Fire both concurrently; without the lock the second read would see '0'
    // and overwrite '0+A' with '0+B'. With the lock the second read sees '0+A'.
    await Promise.all([write('A'), write('B')]);

    expect(onDisk).toBe('0+A+B');
  });
});
