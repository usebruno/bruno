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

    it('records a failed "timed out" result for a callback that never settles, without losing sibling results', async () => {
      const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      test('sync control (before hang)', () => {
        chai.expect(1).to.equal(1);
      });
      test('hung test - never resolves', () => new Promise(() => {}));
      test('sync control (after hang)', () => {
        chai.expect(2).to.equal(2);
      });

      await waitForPendingTests(50);

      const results = __brunoTestResults.getResults();
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ description: 'sync control (before hang)', status: 'pass' }),
          expect.objectContaining({ description: 'sync control (after hang)', status: 'pass' }),
          expect.objectContaining({
            description: 'hung test - never resolves',
            status: 'fail',
            errorName: 'TestTimeoutError'
          })
        ])
      );
      expect(results).toHaveLength(3);
    });

    it('does not record a second result when a timed-out callback goes on to settle on its own', async () => {
      const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      test('eventually passes, too late to matter', async () => {
        await delay(60);
        chai.expect(1).to.equal(1);
      });

      await waitForPendingTests(20);
      // The abandoned callback is still running in the background at this point -
      // give it time to settle and attempt its own (now-suppressed) result write.
      await delay(80);

      const results = __brunoTestResults.getResults();
      expect(results).toEqual([
        expect.objectContaining({
          description: 'eventually passes, too late to matter',
          status: 'fail',
          errorName: 'TestTimeoutError'
        })
      ]);
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

  describe('waitForPendingTests() timer cleanup', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('clears its internal timer once every test settles before the timeout (Promise.all wins the race)', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] });
      const { test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

      test('quick test', async () => {
        await delay(5);
      });

      const pending = waitForPendingTests(5000);
      await jest.advanceTimersByTimeAsync(5);
      await pending;

      expect(jest.getTimerCount()).toBe(0);
    });

    // No equivalent test for the timeout-winning path: by the time that side of the race
    // settles, the timer has already fired on its own, so `getTimerCount()` reads 0 whether
    // or not `clearTimeout` runs afterward - that path has nothing left to discriminate.
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
