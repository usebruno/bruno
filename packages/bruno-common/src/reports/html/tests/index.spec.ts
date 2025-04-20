import { generateHtmlReport } from "../generate-html-report";
import { iterationsData, iterationsDataHtmlString } from "./fixtures/iterations-data";

describe('generateHtmlReport', () => {
  it('should generate the html report', () => {
    const report = generateHtmlReport({ 
      iterationsData,
      offline: false
    });
    expect(report).toBeDefined();
    expect(report).toEqual(iterationsDataHtmlString);
  });
});