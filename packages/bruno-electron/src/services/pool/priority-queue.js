const JobPriority = Object.freeze({
  Lowest: -2,
  Low: -1,
  Normal: 0,
  High: 1,
  Highest: 2
});

const priorityOf = (task) => task.options?.metadata?.priority ?? JobPriority.Normal;

class PriorityTaskQueue {
  #tasksByPriority = new Map();
  #maxPriority = undefined;
  #size = 0;

  push(task) {
    const priority = priorityOf(task);
    const tasks = this.#tasksByPriority.get(priority);
    if (tasks) {
      tasks.push(task);
    } else {
      this.#tasksByPriority.set(priority, [task]);
    }
    if (this.#maxPriority === undefined || priority > this.#maxPriority) {
      this.#maxPriority = priority;
    }
    this.#size++;
  }

  pop() {
    if (this.#maxPriority === undefined) {
      return undefined;
    }
    const tasks = this.#tasksByPriority.get(this.#maxPriority);
    const task = tasks.shift();
    this.#size--;
    if (tasks.length === 0) {
      this.#tasksByPriority.delete(this.#maxPriority);
      this.#maxPriority = this.#tasksByPriority.size > 0 ? Math.max(...this.#tasksByPriority.keys()) : undefined;
    }
    return task;
  }

  size() {
    return this.#size;
  }

  contains(task) {
    const tasks = this.#tasksByPriority.get(priorityOf(task));
    return tasks ? tasks.includes(task) : false;
  }

  clear() {
    this.#tasksByPriority.clear();
    this.#maxPriority = undefined;
    this.#size = 0;
  }
}

module.exports = { PriorityTaskQueue, JobPriority };
