import { T_RunnerResults } from "../../types";
import { isHtmlContentType, getContentType, redactImageData, encodeBase64 } from "../../utils";
import { getRunnerSummary } from "../../runner-summary";
import htmlTemplateString from "./template";

const generateHtmlReport = ({
  runnerResults
}: {
  runnerResults: T_RunnerResults[]
}): string => {
  const resultsWithSummaryAndCleanData = runnerResults.map(({ iterationIndex, results }) => {
    return {
      iterationIndex,
      results: results.map((result) => {
        const { request, response } = result || {};
        const requestContentType = request?.headers ? getContentType(request?.headers) : '';
        const responseContentType = response?.headers ? getContentType(response?.headers) : '';
        return {
          ...result,
          request: {
            ...result.request,
            data: request?.data ? redactImageData(request?.data, requestContentType) : request?.data,
            isHtml: isHtmlContentType(requestContentType)
          },
          response: {
            ...result.response,
            data: response?.data ? redactImageData(response?.data, responseContentType) : response?.data,
            isHtml: isHtmlContentType(responseContentType)
          }
        }
      }),
      summary: getRunnerSummary(results)
    }
  });
  const htmlString = htmlTemplateString(encodeBase64(JSON.stringify(resultsWithSummaryAndCleanData)));
  return htmlString;
};

export { generateHtmlReport }