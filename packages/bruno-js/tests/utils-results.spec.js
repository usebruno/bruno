const { describe, it, expect, afterEach } = require('@jest/globals');
const chai = require('chai');
const { createBruTestResultMethods } = require('../src/utils/results');

const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

describe('utils/results - createBruTestResultMethods', () => {
  describe('test()', () => {
    it('records a passing result for a synchronous callback', async () => {
      const { __brunoTestResults, test } = createBruTestResultMethods(null, [], chai);

      await test('sync pass', () => {
        chai.expect(1).to.equal(1);
      });

      expect(__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({ description: 'sync pass', status: 'pass' })
      ]);
    });

    it('records a failing result with chai AssertionError details for a synchronous callback', async () => {
      const { __brunoTestResults, test } = createBruTestResultMethods(null, [], chai);

      await test('sync fail', () => {
        chai.expect(1).to.equal(2);
      });

      expect(__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({
          description: 'sync fail',
          status: 'fail',
          actual: 1,
          expected: 2,
          errorName: 'AssertionError'
        })
      ]);
    });

    it('records a failing result for a generic thrown error', async () => {
      const { __brunoTestResults, test } = createBruTestResultMethods(null, [], chai);

      await test('generic throw', () => {
        throw new Error('boom');
      });

      expect(__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({ description: 'generic throw', status: 'fail', error: 'boom', errorName: 'Error' })
      ]);
    });

    it('records a passing result for an async callback that resolves', async () => {
      const { __brunoTestResults, test } = createBruTestResultMethods(null, [], chai);

      await test('async pass', async () => {
        const value = await delay(10, 'done');
        chai.expect(value).to.equal('done');
      });

      expect(__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({ description: 'async pass', status: 'pass' })
      ]);
    });

    it('records a failing result for an async callback that rejects', async () => {
      const { __brunoTestResults, test } = createBruTestResultMethods(null, [], chai);

      await test('async fail', async () => {
        await delay(10);
        throw new Error('async boom');
      });

      expect(__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({ description: 'async fail', status: 'fail', error: 'async boom' })
      ]);
    });

    it('returns the same promise it tracks internally, so a script that does `await test(...)` still works', () => {
      const { test } = createBruTestResultMethods(null, [], chai);

      const returned = test('awaited directly', () => {});

      expect(returned).toBeInstanceOf(Promise);
      return returned;
    });
  });

  describe('waitForPendingTests()', () => {
    it('resolves immediately when no test() calls were made', async () => {
      const { waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      await expect(waitForPendingTests()).resolves.toBeUndefined();
    });

    it('waits for a single un-awaited async test() callback to settle before resolving - the core fix', async () => {
      const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      // Fire-and-forget, exactly like a real .bru script: nobody writes `await test(...)`.
      test('un-awaited async test', async () => {
        await delay(30);
        chai.expect('ran').to.equal('ran');
      });

      expect(__brunoTestResults.getResults()).toEqual([]);

      await waitForPendingTests();

      expect(__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({ description: 'un-awaited async test', status: 'pass' })
      ]);
    });

    it('waits for every concurrent async test() callback, not just one', async () => {
      const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      test('sync control', () => {
        chai.expect(1).to.equal(1);
      });
      test('async 10ms', async () => {
        await delay(10);
      });
      test('async 30ms', async () => {
        await delay(30);
      });
      test('async 60ms', async () => {
        await delay(60);
      });

      await waitForPendingTests();

      const descriptions = __brunoTestResults.getResults().map((r) => r.description);
      expect(descriptions).toEqual(
        expect.arrayContaining(['sync control', 'async 10ms', 'async 30ms', 'async 60ms'])
      );
      expect(descriptions).toHaveLength(4);
    });

    it('is a no-op for tests that already settled before it was called', async () => {
      const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      await test('already done', () => {});
      await waitForPendingTests();

      expect(__brunoTestResults.getResults()).toHaveLength(1);
    });

    it('does not reject even if a tracked promise rejects (defensive guard against test.js changing)', async () => {
      let waitForPendingTests, test;

      jest.isolateModules(() => {
        jest.doMock('../src/test', () => () => async () => {
          throw new Error('simulated rejection from a hypothetical future test() implementation');
        });
        ({ test, waitForPendingTests } = require('../src/utils/results').createBruTestResultMethods(null, [], chai));
      });

      test('doomed test');

      await expect(waitForPendingTests()).resolves.toBeUndefined();
    });

    it('waits for a test() registered from inside another callback after an await, not just the initial batch', async () => {
      const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      test('outer async', async () => {
        await delay(10);
        // Only pushed once this callback resumes - after waitForPendingTests() has
        // already started waiting on the batch that existed when it was called.
        test('inner registered after wait started', async () => {
          await delay(10);
          chai.expect('ran').to.equal('ran');
        });
      });

      await waitForPendingTests();

      const descriptions = __brunoTestResults.getResults().map((r) => r.description);
      expect(descriptions).toEqual(
        expect.arrayContaining(['outer async', 'inner registered after wait started'])
      );
    });
  });

  describe('waitForPendingTests() with fake timers', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('clears its poll timer once a batch settles, rather than leaving it dangling', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] });
      const { test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      test('quick test', async () => {
        await delay(5);
      });

      const pending = waitForPendingTests();
      await jest.advanceTimersByTimeAsync(5);
      await pending;

      expect(jest.getTimerCount()).toBe(0);
    });

    it('keeps waiting well past a single poll interval for a callback that eventually settles - there is no fixed cap', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] });
      const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      // Spans several poll ticks (TEST_POLL_INTERVAL_MS is 2s), unlike the other tests here.
      test('slower than several poll intervals', async () => {
        await delay(6000);
        chai.expect(1).to.equal(1);
      });

      const pending = waitForPendingTests();
      await jest.advanceTimersByTimeAsync(6000);
      await pending;

      expect(__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({ description: 'slower than several poll intervals', status: 'pass' })
      ]);
    });
  });

  describe('Negative Test', () => {
    it('misses a test() registered from a detached setTimeout, unlike one chained through an awaited callback', async () => {
      const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      // A's callback is synchronous, so its own tracked promise settles before the timer
      // fires - nothing connects B's later test() call back to anything being watched.
      test('A (starts a detached timer)', () => {
        setTimeout(() => {
          test('B (registered later, detached from A)', () => {
            chai.expect(1).to.equal(1);
          });
        }, 50);
      });

      await waitForPendingTests();

      // Known, accepted gap - see "Detached-trigger test() registration" in findings/async-await.md.
      const descriptionsAtWaitExit = __brunoTestResults.getResults().map((r) => r.description);
      expect(descriptionsAtWaitExit).toEqual(['A (starts a detached timer)']);

      // B still runs eventually - it's just too late for anyone still reading results.
      await delay(80);
      const descriptionsLater = __brunoTestResults.getResults().map((r) => r.description);
      expect(descriptionsLater).toEqual(
        expect.arrayContaining(['A (starts a detached timer)', 'B (registered later, detached from A)'])
      );
    });
  });

  describe('isolation between instances', () => {
    it('does not share pending-test state between two separate createBruTestResultMethods() calls', async () => {
      const first = createBruTestResultMethods(null, [], chai);
      const second = createBruTestResultMethods(null, [], chai);

      first.test('only in first', async () => {
        await delay(20);
      });

      // Second instance has nothing pending, so this must resolve immediately
      // regardless of the first instance's still-pending test.
      await expect(second.waitForPendingTests()).resolves.toBeUndefined();
      expect(second.__brunoTestResults.getResults()).toEqual([]);

      await first.waitForPendingTests();
      expect(first.__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({ description: 'only in first' })
      ]);
    });
  });
});
