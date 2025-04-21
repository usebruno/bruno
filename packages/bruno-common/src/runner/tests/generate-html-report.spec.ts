import { generateHtmlReport } from "../reports/html/generate-report";
import { runnerResults, runnerResultsRequestsDetails, runnerResultsSummaryStats } from "./fixtures/generate-html-report";
import { getHtmlText, renderStaticHtml } from "./utils";

describe('generateHtmlReport', () => {
  it('should generate a html report and display proper stats on the summary page', async () => {
    const htmlReport = generateHtmlReport({ runnerResults });
    const renderedSummaryPage = await renderStaticHtml(htmlReport, '?tab=summary');
    const iterationSummaryText = getHtmlText(renderedSummaryPage)
    expect(htmlReport).toBeDefined();
    expect(renderedSummaryPage).toBeDefined();
    expect(iterationSummaryText).toBeDefined();
    expect(iterationSummaryText).toEqual(runnerResultsSummaryStats);
  });

  it('should generate a html report and display proper stats on the requests page', async () => {
    const htmlReport = generateHtmlReport({ runnerResults });
    const renderedRequestsPage = await renderStaticHtml(htmlReport, '?tab=requests');
    const iterationResultsText = getHtmlText(renderedRequestsPage)
    expect(htmlReport).toBeDefined();
    expect(renderedRequestsPage).toBeDefined();
    expect(iterationResultsText).toBeDefined();
    expect(iterationResultsText).toEqual(runnerResultsRequestsDetails);
  });
});