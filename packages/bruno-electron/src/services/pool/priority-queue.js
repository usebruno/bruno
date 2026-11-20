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
      tasks.items.push(task);
    } else {
      this.#tasksByPriority.set(priority, { items: [task], head: 0 });
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
    const task = tasks.items[tasks.head];
    tasks.items[tasks.head] = undefined;
    tasks.head++;
    this.#size--;
    if (tasks.head === tasks.items.length) {
      this.#tasksByPriority.delete(this.#maxPriority);
      this.#maxPriority = this.#tasksByPriority.size > 0 ? Math.max(...this.#tasksByPriority.keys()) : undefined;
    } else if (tasks.head * 2 >= tasks.items.length) {
      tasks.items.splice(0, tasks.head);
      tasks.head = 0;
    }
    return task;
  }

  size() {
    return this.#size;
  }

  contains(task) {
    const tasks = this.#tasksByPriority.get(priorityOf(task));
    return tasks ? tasks.items.includes(task, tasks.head) : false;
  }

  clear() {
    this.#tasksByPriority.clear();
    this.#maxPriority = undefined;
    this.#size = 0;
  }
}

module.exports = { PriorityTaskQueue, JobPriority };
