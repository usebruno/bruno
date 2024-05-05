import { nanoid } from 'nanoid';

export type TestResult = {
  uid: string;
  description: string;
  status: 'fail' | 'pass';
  error?: string;
  actual?: any;
  expected?: any;
};

export class TestResults {
  private results: TestResult[] = [];

  addResult(result: Omit<TestResult, 'uid'>) {
    this.results.push({
      ...result,
      uid: nanoid()
    });
  }

  getResults() {
    return this.results;
  }
}
