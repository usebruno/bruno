import { IterationsDataType } from "./types";
import { isHtmlContentType, getContentType, redactImageData } from "./utils";
import { getIterationRunSummary } from "./run-summary";
import getHmlTemplateString from "./template";
const generateHtmlReport = ({
  iterationsData, offline = false
}: {
  iterationsData: IterationsDataType[], offline: boolean
}): string => {
  const resultsWithSummaryAndCleanData = iterationsData.map(({ iterationIndex, results }) => {
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
      summary: getIterationRunSummary(results)
    }
  });
  const replaceOpeningAngularBracket = (str: string) => str.replace(/</g, '__bruno__opening_angular_bracket__');
  const htmlString = getHmlTemplateString({ dataString: replaceOpeningAngularBracket(JSON.stringify(resultsWithSummaryAndCleanData)), offline });
  return htmlString;
};

export { generateHtmlReport }