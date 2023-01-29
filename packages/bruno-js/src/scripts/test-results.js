class TestResults {
  constructor() {
    this.results = [];
  }

  addResult(result) {
    this.results.push(result);
  }

  getResults() {
    return this.results;
  }
}

module.exports = TestResults;
