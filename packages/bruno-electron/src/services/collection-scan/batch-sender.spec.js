const { createBatchSender } = require('./batch-sender');

describe('createBatchSender', () => {
  let send;
  let batches;

  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    send = jest.fn();
    batches = createBatchSender(send);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advanceTo = (time) => jest.advanceTimersByTime(time - Date.now());

  it('sends the first collection on the next tick', () => {
    batches.add('payments');

    expect(send).not.toHaveBeenCalled();

    jest.advanceTimersByTime(0);

    expect(send).toHaveBeenCalledWith(['payments']);
  });

  it('holds collections found within 250 ms of a send for one batch', () => {
    batches.add('payments');
    advanceTo(100);
    batches.add('orders');
    advanceTo(200);
    batches.add('billing');
    advanceTo(249);

    expect(send.mock.calls).toEqual([[['payments']]]);

    advanceTo(250);

    expect(send.mock.calls).toEqual([[['payments']], [['orders', 'billing']]]);
  });

  it('never holds a collection for more than 250 ms', () => {
    const addedAt = new Map();
    const waits = [];
    send.mockImplementation((collections) => {
      collections.forEach((collection) => waits.push(Date.now() - addedAt.get(collection)));
    });

    [0, 10, 240, 260, 600, 601, 1000].forEach((time) => {
      advanceTo(time);
      addedAt.set(time, time);
      batches.add(time);
    });
    advanceTo(1250);

    expect(waits).toHaveLength(7);
    expect(Math.max(...waits)).toBeLessThanOrEqual(250);
  });

  it('sends what is left on flush and drops the timed send', () => {
    batches.add('payments');
    batches.flush();

    expect(send.mock.calls).toEqual([[['payments']]]);

    batches.add('orders');
    advanceTo(249);

    expect(send.mock.calls).toEqual([[['payments']]]);

    advanceTo(250);

    expect(send.mock.calls).toEqual([[['payments']], [['orders']]]);
  });

  it('sends nothing when nothing is waiting', () => {
    batches.flush();
    jest.advanceTimersByTime(1000);

    expect(send).not.toHaveBeenCalled();
  });
});
