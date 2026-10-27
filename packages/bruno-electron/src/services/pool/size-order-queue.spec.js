const { SizeOrderTaskQueue, largeWorkerCap } = require('./size-order-queue');

const task = (name, size) => {
  const promise = { pending: true };
  return {
    method: name,
    options: size === undefined ? {} : { metadata: { size } },
    resolver: {
      promise,
      resolve() {
        promise.pending = false;
      },
      reject() {
        promise.pending = false;
      }
    }
  };
};

const drain = (queue) => {
  const names = [];
  while (queue.size() > 0) {
    names.push(queue.pop().method);
  }
  return names;
};

describe('largeWorkerCap', () => {
  it('uses size-order only below 3 workers', () => {
    expect(largeWorkerCap(1)).toBe(0);
    expect(largeWorkerCap(2)).toBe(0);
  });

  it('gives large files 1 worker out of 3', () => {
    expect(largeWorkerCap(3)).toBe(1);
  });

  it('caps large files at 1/4 of the pool', () => {
    expect(largeWorkerCap(4)).toBe(1);
    expect(largeWorkerCap(7)).toBe(1);
    expect(largeWorkerCap(8)).toBe(2);
    expect(largeWorkerCap(16)).toBe(4);
  });
});

describe('SizeOrderTaskQueue', () => {
  it('pops smaller files first and keeps FIFO order at the same size', () => {
    const queue = new SizeOrderTaskQueue({ maxWorkers: 2 });
    queue.push(task('b', 20));
    queue.push(task('a', 10));
    queue.push(task('c', 10));
    queue.push(task('d', 30));
    queue.push(task('missing'));

    expect(drain(queue)).toEqual(['missing', 'a', 'c', 'b', 'd']);
  });

  it('parses larger files last when there are fewer than 3 workers', () => {
    const queue = new SizeOrderTaskQueue({ maxWorkers: 2 });
    [100, 1, 50, 2, 200].forEach((size, i) => queue.push(task(`f${size}`, size)));

    expect(drain(queue)).toEqual(['f1', 'f2', 'f50', 'f100', 'f200']);
  });

  it('gives 1 of 3 workers to the largest queued file after 2 small files start', () => {
    const queue = new SizeOrderTaskQueue({ maxWorkers: 3 });
    [1, 2, 3, 4, 100].forEach((size) => queue.push(task(`f${size}`, size)));

    expect(queue.pop().method).toBe('f1');
    expect(queue.pop().method).toBe('f2');
    expect(queue.pop().method).toBe('f100');
    expect(drain(queue)).toEqual(['f3', 'f4']);
  });

  it('gives 1/4 of workers to the largest queued files after small files fill the rest', () => {
    const queue = new SizeOrderTaskQueue({ maxWorkers: 8 });
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 200].forEach((size) => queue.push(task(`f${size}`, size)));

    expect([queue.pop().method, queue.pop().method, queue.pop().method, queue.pop().method, queue.pop().method, queue.pop().method]).toEqual([
      'f1', 'f2', 'f3', 'f4', 'f5', 'f6'
    ]);
    expect(queue.pop().method).toBe('f200');
    expect(queue.pop().method).toBe('f100');
    expect(drain(queue)).toEqual(['f7', 'f8', 'f9', 'f10']);
  });

  it('starts another large file after an in-flight large file finishes', () => {
    const queue = new SizeOrderTaskQueue({ maxWorkers: 4 });
    [1, 2, 3, 4, 50, 100].forEach((size) => queue.push(task(`f${size}`, size)));

    const small = [queue.pop(), queue.pop(), queue.pop()];
    const large = queue.pop();
    expect(small.map((t) => t.method)).toEqual(['f1', 'f2', 'f3']);
    expect(large.method).toBe('f100');

    large.resolver.resolve();
    expect(queue.pop().method).toBe('f50');
  });

  it('uses remaining workers on leftover files once only large work is queued', () => {
    const queue = new SizeOrderTaskQueue({ maxWorkers: 8 });
    [100, 200, 300, 400].forEach((size) => queue.push(task(`f${size}`, size)));

    expect(drain(queue)).toEqual(['f100', 'f200', 'f300', 'f400']);
  });

  it('interleaves pushes and pops by size', () => {
    const queue = new SizeOrderTaskQueue({ maxWorkers: 2 });
    queue.push(task('big', 80));
    queue.push(task('small', 8));
    expect(queue.pop().method).toBe('small');

    queue.push(task('tiny', 1));
    queue.push(task('mid', 20));
    expect(drain(queue)).toEqual(['tiny', 'mid', 'big']);
  });

  it('tracks membership, size and clearing', () => {
    const queue = new SizeOrderTaskQueue({ maxWorkers: 4 });
    const first = task('first', 10);
    const second = task('second', 20);
    queue.push(first);
    queue.push(second);

    expect(queue.size()).toBe(2);
    expect(queue.contains(first)).toBe(true);

    queue.pop();
    expect(queue.contains(first)).toBe(false);
    expect(queue.contains(second)).toBe(true);

    queue.clear();
    expect(queue.size()).toBe(0);
    expect(queue.contains(second)).toBe(false);
    expect(queue.pop()).toBeUndefined();
  });
});
