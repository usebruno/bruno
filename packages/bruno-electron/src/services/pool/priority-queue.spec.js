const { PriorityTaskQueue, JobPriority } = require('./priority-queue');

const task = (name, priority) => ({ method: name, options: priority === undefined ? {} : { metadata: { priority } } });

const drain = (queue) => {
  const names = [];
  while (queue.size() > 0) {
    names.push(queue.pop().method);
  }
  return names;
};

describe('PriorityTaskQueue', () => {
  it('pops higher priority tasks first and keeps FIFO order within a priority', () => {
    const queue = new PriorityTaskQueue();
    queue.push(task('low-1', JobPriority.Low));
    queue.push(task('lowest-1', JobPriority.Lowest));
    queue.push(task('default-1'));
    queue.push(task('highest-1', JobPriority.Highest));
    queue.push(task('high-1', JobPriority.High));
    queue.push(task('default-2', JobPriority.Normal));
    queue.push(task('high-2', JobPriority.High));
    queue.push(task('lowest-2', JobPriority.Lowest));
    queue.push(task('low-2', JobPriority.Low));
    queue.push(task('highest-2', JobPriority.Highest));

    expect(drain(queue)).toEqual([
      'highest-1',
      'highest-2',
      'high-1',
      'high-2',
      'default-1',
      'default-2',
      'low-1',
      'low-2',
      'lowest-1',
      'lowest-2'
    ]);
  });

  it('keeps FIFO order for a large batch of equal-priority tasks', () => {
    const queue = new PriorityTaskQueue();
    const names = Array.from({ length: 200 }, (_, i) => `task-${i}`);
    names.forEach((name) => queue.push(task(name)));

    expect(drain(queue)).toEqual(names);
  });

  it('interleaves pushes and pops by priority', () => {
    const queue = new PriorityTaskQueue();
    queue.push(task('a', JobPriority.Low));
    queue.push(task('b', JobPriority.High));
    expect(queue.pop().method).toBe('b');

    queue.push(task('c', JobPriority.Normal));
    queue.push(task('d', JobPriority.Low));
    expect(drain(queue)).toEqual(['c', 'a', 'd']);
  });

  it('tracks membership, size and clearing', () => {
    const queue = new PriorityTaskQueue();
    const first = task('first');
    const second = task('second');
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
