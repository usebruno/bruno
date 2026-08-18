import { executeCleanupPlans } from './cleanup-runner';

const requestOne = { uid: 'request-1', name: 'Disconnect session' };
const requestTwo = { uid: 'request-2', name: 'Delete test data' };
const plans = [{
  collectionUid: 'collection-1',
  collectionName: 'Test API',
  requests: [requestOne, requestTwo],
  missingRequestPaths: []
}];

describe('executeCleanupPlans', () => {
  afterEach(() => jest.useRealTimers());

  it('runs cleanup requests sequentially', async () => {
    const order = [];
    const runRequest = jest.fn(async (request) => {
      order.push(`start-${request.uid}`);
      await Promise.resolve();
      order.push(`end-${request.uid}`);
    });

    await executeCleanupPlans({ plans, runRequest, timeoutMs: 1000 });

    expect(order).toEqual([
      'start-request-1',
      'end-request-1',
      'start-request-2',
      'end-request-2'
    ]);
  });

  it('stops after a failed cleanup request', async () => {
    const runRequest = jest.fn((request) => {
      if (request.uid === 'request-1') return Promise.reject(new Error('network failed'));
      return Promise.resolve();
    });

    await expect(executeCleanupPlans({ plans, runRequest, timeoutMs: 1000 }))
      .rejects.toThrow('network failed');
    expect(runRequest).toHaveBeenCalledTimes(1);
  });

  it('times out and cancels a stalled cleanup request', async () => {
    jest.useFakeTimers();
    const runRequest = jest.fn(() => new Promise(() => undefined));
    const cancelRequest = jest.fn();
    const timeoutPlan = { ...plans[0], requests: [requestOne] };

    const execution = executeCleanupPlans({
      plans: [timeoutPlan],
      runRequest,
      cancelRequest,
      timeoutMs: 2500
    });
    const rejection = expect(execution).rejects.toThrow('timed out after 3 seconds');
    await jest.advanceTimersByTimeAsync(2500);

    await rejection;
    expect(cancelRequest).toHaveBeenCalledWith(requestOne, timeoutPlan);
  });

  it('does not report the timeout until asynchronous cancellation has completed', async () => {
    jest.useFakeTimers();
    let finishCancellation;
    let finishRequest;
    let timeoutReported = false;
    const cancelRequest = jest.fn(() => new Promise((resolve) => {
      finishCancellation = resolve;
    }));
    const execution = executeCleanupPlans({
      plans: [{ ...plans[0], requests: [requestOne] }],
      runRequest: () => new Promise((resolve) => {
        finishRequest = resolve;
      }),
      cancelRequest,
      timeoutMs: 1000,
      cancellationTimeoutMs: 5000
    });
    execution.catch(() => {
      timeoutReported = true;
    });

    await jest.advanceTimersByTimeAsync(1000);
    expect(cancelRequest).toHaveBeenCalledTimes(1);
    expect(timeoutReported).toBe(false);

    finishRequest();
    await Promise.resolve();
    expect(timeoutReported).toBe(false);

    finishCancellation();
    await expect(execution).rejects.toThrow('timed out after 1 seconds');
    expect(timeoutReported).toBe(true);
  });

  it('propagates a cancellation failure instead of reporting a successful timeout cancellation', async () => {
    jest.useFakeTimers();
    const cancellationError = new Error('request cancellation failed');
    const execution = executeCleanupPlans({
      plans: [{ ...plans[0], requests: [requestOne] }],
      runRequest: () => new Promise(() => undefined),
      cancelRequest: () => Promise.reject(cancellationError),
      timeoutMs: 1000,
      cancellationTimeoutMs: 5000
    });
    const rejection = expect(execution).rejects.toBe(cancellationError);

    await jest.advanceTimersByTimeAsync(1000);

    await rejection;
  });

  it('bounds the wait when cancellation never completes', async () => {
    jest.useFakeTimers();
    let timeoutReported = false;
    const execution = executeCleanupPlans({
      plans: [{ ...plans[0], requests: [requestOne] }],
      runRequest: () => new Promise(() => undefined),
      cancelRequest: () => new Promise(() => undefined),
      timeoutMs: 1000,
      cancellationTimeoutMs: 2000
    });
    const rejection = expect(execution).rejects.toThrow('Cancellation for cleanup request');
    execution.catch(() => {
      timeoutReported = true;
    });

    await jest.advanceTimersByTimeAsync(2999);
    expect(timeoutReported).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    await rejection;
    expect(timeoutReported).toBe(true);
  });

  it('fails before executing anything when a configured request is missing', async () => {
    const runRequest = jest.fn();

    await expect(executeCleanupPlans({
      plans: [{ ...plans[0], missingRequestPaths: ['missing-request.bru'] }],
      runRequest
    })).rejects.toThrow('no longer exist');
    expect(runRequest).not.toHaveBeenCalled();
  });
});
