// Smallest files first. With 3+ workers, up to 1/4 of the pool (1/3 if 3 workers)
// start the largest queued files once the rest of the workers are on small ones.
const sizeOf = (task) => task.options?.metadata?.size ?? 0;

const largeWorkerCap = (maxWorkers) => {
  if (maxWorkers < 3) return 0;
  if (maxWorkers === 3) return 1;
  return Math.floor(maxWorkers / 4);
};

class SizeOrderTaskQueue {
  #tasks = [];
  #maxWorkers;
  #largeCap;
  #smallInFlight = 0;
  #largeInFlight = 0;

  constructor({ maxWorkers = 1 } = {}) {
    this.#maxWorkers = maxWorkers;
    this.#largeCap = largeWorkerCap(maxWorkers);
  }

  push(task) {
    const size = sizeOf(task);
    let i = this.#tasks.length;
    while (i > 0 && sizeOf(this.#tasks[i - 1]) > size) {
      i -= 1;
    }
    this.#tasks.splice(i, 0, task);
  }

  pop() {
    if (this.#tasks.length === 0) return undefined;

    const takeLarge = this.#largeCap > 0
      && this.#largeInFlight < this.#largeCap
      && this.#smallInFlight >= this.#maxWorkers - this.#largeCap;

    const task = takeLarge ? this.#tasks.pop() : this.#tasks.shift();
    this.#track(task, takeLarge);
    return task;
  }

  size() {
    return this.#tasks.length;
  }

  contains(task) {
    return this.#tasks.includes(task);
  }

  clear() {
    this.#tasks = [];
  }

  #track(task, isLarge) {
    if (isLarge) this.#largeInFlight += 1;
    else this.#smallInFlight += 1;

    const resolver = task.resolver;
    if (!resolver) return;

    const originalResolve = resolver.resolve.bind(resolver);
    const originalReject = resolver.reject.bind(resolver);
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (isLarge) this.#largeInFlight -= 1;
      else this.#smallInFlight -= 1;
    };

    resolver.resolve = (value) => {
      settle();
      return originalResolve(value);
    };
    resolver.reject = (reason) => {
      settle();
      return originalReject(reason);
    };
  }
}

module.exports = { SizeOrderTaskQueue, largeWorkerCap };
