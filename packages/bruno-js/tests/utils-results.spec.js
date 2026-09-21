const { describe, it, expect } = require('@jest/globals');
const chai = require('chai');
const { createBruTestResultMethods } = require('../src/utils/results');

const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

describe('utils/results - createBruTestResultMethods() tracks test() calls a script never awaits itself', () => {
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

      const returned = test('awaited directly', () => { });

      expect(returned).toBeInstanceOf(Promise);
      return returned;
    });
  });

  describe('waitForPendingTests()', () => {
    describe('basic waiting behavior', () => {
      it('resolves immediately when no test() calls were made', async () => {
        const { waitForPendingTests } = createBruTestResultMethods(null, [], chai);

        await expect(waitForPendingTests()).resolves.toBeUndefined();
      });

      it('waits for a single un-awaited async test() callback to settle before resolving, so its result is not silently dropped', async () => {
        const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

        // test() is called here without awaiting it.
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

        await test('already done', () => { });
        await waitForPendingTests();

        expect(__brunoTestResults.getResults()).toHaveLength(1);
      });
    });

    describe('draining a test() registered while the wait is already in progress', () => {
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

      it('waits as long as a callback takes to settle, with no fixed timeout or cap', async () => {
        const { __brunoTestResults, test, waitForPendingTests } = createBruTestResultMethods(null, [], chai);

        test('slow test', async () => {
          await delay(150);
          chai.expect(1).to.equal(1);
        });

        await waitForPendingTests();

        expect(__brunoTestResults.getResults()).toEqual([
          expect.objectContaining({ description: 'slow test', status: 'pass' })
        ]);
      });
    });

    describe('defensive guard against test.js changing', () => {
      it('does not reject even if a tracked promise rejects', async () => {
        let waitForPendingTests, test;

        jest.isolateModules(() => {
          jest.doMock('../src/test', () => () => async () => {
            throw new Error('simulated rejection from a hypothetical future test() implementation');
          });
          ({ test, waitForPendingTests } = require('../src/utils/results').createBruTestResultMethods(null, [], chai));
        });

        // Triggers the mocked, always-rejecting Test() above.
        test('a test() call whose underlying promise rejects');

        await expect(waitForPendingTests()).resolves.toBeUndefined();
      });
    });
  });

  describe('isolation between instances', () => {
    it('does not share pending-test state between two separate createBruTestResultMethods() calls', async () => {
      // Mirrors two real script phases (e.g. pre-request and tests), each with its own call.
      const preRequestPhase = createBruTestResultMethods(null, [], chai);
      const testsPhase = createBruTestResultMethods(null, [], chai);

      preRequestPhase.test('only in the pre-request phase', async () => {
        await delay(20);
      });

      // The tests phase has nothing pending, so this resolves immediately - it has
      // no visibility into the pre-request phase's still-running test.
      await expect(testsPhase.waitForPendingTests()).resolves.toBeUndefined();
      expect(testsPhase.__brunoTestResults.getResults()).toEqual([]);

      await preRequestPhase.waitForPendingTests();
      expect(preRequestPhase.__brunoTestResults.getResults()).toEqual([
        expect.objectContaining({ description: 'only in the pre-request phase' })
      ]);
    });
  });
});
