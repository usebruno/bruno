const { nanoid } = require('nanoid');

class TestResults {
  constructor() {
    this.results = [];
  }

  addResult(result) {
    result.uid = nanoid();
    this.results.push(result);
    return this;
  }

  addMultipleResults(results) {
    results.forEach((result) => {
      this.addResult(result);
    });
    return this;
  }

  getResults() {
    return this.results;
  }
}

module.exports = TestResults;
