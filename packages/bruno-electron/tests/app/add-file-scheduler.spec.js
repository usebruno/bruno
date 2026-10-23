const { createAddFileScheduler } = require('../../src/app/add-file-scheduler');

const flushSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

describe('createAddFileScheduler', () => {
  it('does not run all enqueued work in the same synchronous turn', async () => {
    const runTurns = [];
    let syncBurst = 0;
    let maxSyncBurst = 0;

    const scheduler = createAddFileScheduler(() => {
      syncBurst += 1;
      runTurns.push({ syncBurst });
      maxSyncBurst = Math.max(maxSyncBurst, syncBurst);
      syncBurst -= 1;
    });

    for (let i = 0; i < 50; i++) {
      scheduler.enqueue(`/tmp/file-${i}.bru`);
    }

    expect(maxSyncBurst).toBe(1);

    for (let i = 0; i < 50; i++) {
      await flushSetImmediate();
    }

    expect(runTurns.length).toBe(50);
  });

  it('drains at most one file per macrotask after the initial sync start', async () => {
    let runCount = 0;
    const scheduler = createAddFileScheduler(() => {
      runCount += 1;
    });

    for (let i = 0; i < 20; i++) {
      scheduler.enqueue(`/tmp/file-${i}.bru`);
    }

    expect(runCount).toBe(1);

    await flushSetImmediate();
    expect(runCount).toBe(2);

    await flushSetImmediate();
    expect(runCount).toBe(3);

    while (runCount < 20) {
      await flushSetImmediate();
    }
  });

  it('clear() cancels the pending tick so remaining files do not start', async () => {
    let runCount = 0;
    const scheduler = createAddFileScheduler(() => {
      runCount += 1;
    });

    for (let i = 0; i < 20; i++) {
      scheduler.enqueue(`/tmp/file-${i}.bru`);
    }

    expect(runCount).toBe(1);
    scheduler.clear();

    await flushSetImmediate();
    await flushSetImmediate();
    expect(runCount).toBe(1);
  });

  it('does not wait for async runAdd before starting the next file on a later tick', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const scheduler = createAddFileScheduler(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
    });

    for (let i = 0; i < 4; i++) {
      scheduler.enqueue(`/tmp/file-${i}.bru`);
    }

    for (let i = 0; i < 8; i++) {
      await flushSetImmediate();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(maxInFlight).toBeGreaterThan(1);
  });
});
