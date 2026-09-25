class BenchmarkAggregator {
  constructor() {
    this.events = [];
  }

  push(...events) {
    for (const event of events) {
      if (event) {
        this.events.push(event);
      }
    }
  }

  drain() {
    const drained = this.events;
    this.events = [];
    return drained;
  }

  size() {
    return this.events.length;
  }
}

module.exports = BenchmarkAggregator;
