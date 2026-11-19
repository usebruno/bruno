const JobPriority = Object.freeze({
  search: 1,
  index: 3,
  mount: 5
});

const DEFAULT_AGING_MS = 1000;

const priorityOf = (task) => task.options?.metadata?.priority ?? JobPriority.mount;

/**
 * workerpool custom queueStrategy — lower metadata.priority runs first, and every agingMs a task waits
 * lowers its effective priority by one so lower-priority work is never starved.
 * @see https://github.com/josdejong/workerpool/blob/master/examples/priorityQueue.js
 */
class PriorityQueue {
  #now;
  #agingMs;
  #buckets = new Map();
  #count = 0;
  #sequence = 0;

  constructor({ now = Date.now, agingMs = DEFAULT_AGING_MS } = {}) {
    this.#now = now;
    this.#agingMs = agingMs;
  }

  push(task) {
    const priority = priorityOf(task);
    let bucket = this.#buckets.get(priority);
    if (!bucket) {
      bucket = [];
      this.#buckets.set(priority, bucket);
    }
    bucket.push({ task, enqueuedAt: this.#now(), sequence: this.#sequence++ });
    this.#count += 1;
  }

  pop() {
    const now = this.#now();
    let best = null;
    for (const [priority, bucket] of this.#buckets) {
      const head = bucket[0];
      if (!head) continue;
      const effective = priority - (now - head.enqueuedAt) / this.#agingMs;
      if (
        !best
        || effective < best.effective
        || (effective === best.effective && head.sequence < best.head.sequence)
      ) {
        best = { bucket, head, effective };
      }
    }
    if (!best) return undefined;
    best.bucket.shift();
    this.#count -= 1;
    return best.head.task;
  }

  size() {
    return this.#count;
  }

  contains(task) {
    for (const bucket of this.#buckets.values()) {
      if (bucket.some((entry) => entry.task === task)) return true;
    }
    return false;
  }

  clear() {
    this.#buckets.clear();
    this.#count = 0;
  }

  // Removes and returns the queued (not yet started) tasks matching the predicate
  remove(predicate) {
    const removed = [];
    for (const [priority, bucket] of this.#buckets) {
      const kept = [];
      for (const entry of bucket) (predicate(entry.task) ? removed : kept).push(entry);
      this.#buckets.set(priority, kept);
    }
    this.#count -= removed.length;
    return removed.map((entry) => entry.task);
  }
}

module.exports = { PriorityQueue, JobPriority };
