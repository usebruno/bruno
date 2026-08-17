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

  it('fails before executing anything when a configured request is missing', async () => {
    const runRequest = jest.fn();

    await expect(executeCleanupPlans({
      plans: [{ ...plans[0], missingRequestPaths: ['missing-request.bru'] }],
      runRequest
    })).rejects.toThrow('no longer exist');
    expect(runRequest).not.toHaveBeenCalled();
  });
});
