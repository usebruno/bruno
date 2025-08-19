import { T_RunnerResults } from "../../types";
import { isHtmlContentType, getContentType, redactImageData, encodeBase64 } from "../../utils";
import htmlTemplateString from "./template";

const generateHtmlReport = ({
  runnerResults,
  cliVersion = '', // Default to empty string if not provided
  environment = null // Default environment if not provided
}: {
  runnerResults: T_RunnerResults[];
  cliVersion?: string;
  environment?: string | null;
}): string => {
  const resultsWithSummaryAndCleanData = runnerResults.map(({ iterationIndex, results, summary }) => {
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
      summary
    }
  });
  const htmlString = htmlTemplateString(encodeBase64(JSON.stringify({
    results: resultsWithSummaryAndCleanData,
    cliVersion,
    environment
  })));
  return htmlString;
};

export { generateHtmlReport }