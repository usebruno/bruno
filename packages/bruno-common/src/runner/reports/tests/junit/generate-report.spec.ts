import { generateJunitReport } from "../../junit/generate-report";
import { runnerResults, junitReportJson } from "./fixtures/runner-results";

describe('makeJUnitOutput', () => {
  const MOCK_DATE = new Date('2025-04-26T00:00:00.000Z');

  beforeEach(() => {
    jest.spyOn(global, 'Date').mockReturnValue(MOCK_DATE);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should produce a junit spec object for serialization', () => {
    const junit = generateJunitReport({ runnerResults: runnerResults, config: { hostname: 'hostname' } });
    expect(junit).toEqual(junitReportJson);
  });
});