const { PriorityQueue, JobPriority } = require('./priority-queue');

const task = (priority, name = String(priority)) => ({
  name,
  method: 'parse-file',
  params: [],
  resolver: { promise: { pending: true } },
  timeout: null,
  options: { metadata: { priority } }
});

const clock = () => {
  let time = 0;
  return { now: () => time, advance: (ms) => { time += ms; } };
};

describe('PriorityQueue', () => {
  it('dequeues lower priority numbers first', () => {
    const queue = new PriorityQueue();
    queue.push(task(JobPriority.mount));
    queue.push(task(JobPriority.index));
    queue.push(task(JobPriority.search));
    queue.push(task(JobPriority.mount));

    expect(queue.pop().options.metadata.priority).toBe(JobPriority.search);
    expect(queue.pop().options.metadata.priority).toBe(JobPriority.index);
    expect(queue.pop().options.metadata.priority).toBe(JobPriority.mount);
    expect(queue.pop().options.metadata.priority).toBe(JobPriority.mount);
    expect(queue.pop()).toBeUndefined();
  });

  it('keeps FIFO order within the same priority', () => {
    const queue = new PriorityQueue();
    queue.push(task(JobPriority.mount, 'a'));
    queue.push(task(JobPriority.mount, 'b'));
    queue.push(task(JobPriority.mount, 'c'));

    expect([queue.pop().name, queue.pop().name, queue.pop().name]).toEqual(['a', 'b', 'c']);
  });

  it('ages waiting tasks so mount work is not starved by continuous searches', () => {
    const { now, advance } = clock();
    const queue = new PriorityQueue({ now, agingMs: 100 });
    queue.push(task(JobPriority.mount, 'mount'));

    advance(300);
    queue.push(task(JobPriority.search, 'fresh-search'));
    expect(queue.pop().name).toBe('fresh-search');

    advance(100);
    queue.push(task(JobPriority.search, 'next-search'));
    expect(queue.pop().name).toBe('mount');
    expect(queue.pop().name).toBe('next-search');
  });

  it('breaks effective-priority ties by enqueue order', () => {
    const { now, advance } = clock();
    const queue = new PriorityQueue({ now, agingMs: 100 });
    queue.push(task(JobPriority.index, 'index'));
    advance(200);
    queue.push(task(JobPriority.search, 'search'));

    expect(queue.pop().name).toBe('index');
  });

  it('tracks size and membership', () => {
    const queue = new PriorityQueue();
    const queued = task(JobPriority.search);
    queue.push(queued);
    queue.push(task(JobPriority.mount));

    expect(queue.size()).toBe(2);
    expect(queue.contains(queued)).toBe(true);
    queue.pop();
    expect(queue.contains(queued)).toBe(false);
    queue.clear();
    expect(queue.size()).toBe(0);
  });

  it('removes queued tasks matching a predicate', () => {
    const queue = new PriorityQueue();
    queue.push(task(JobPriority.search, 'search'));
    queue.push(task(JobPriority.index, 'index'));
    queue.push(task(JobPriority.mount, 'mount'));

    const removed = queue.remove((queued) => queued.options.metadata.priority !== JobPriority.mount);

    expect(removed.map((queued) => queued.name).sort()).toEqual(['index', 'search']);
    expect(queue.size()).toBe(1);
    expect(queue.pop().name).toBe('mount');
  });
});
