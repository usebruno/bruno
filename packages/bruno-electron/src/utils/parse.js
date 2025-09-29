const { parseRequestAndRedactBody, parseRequestViaWorker } = require('@usebruno/filestore');

/**
 * Parses a large BRU request string by redacting body blocks, parsing the remainder,
 * and then reinserting extracted body content into the parsed structure.
 * @param {string} bruContent
 * @returns {Promise<any>} parsed request JSON
 */
async function parseLargeRequestWithRedaction(bruContent) {
  const { bruFileStringWithRedactedBody, extractedBodyContent } = parseRequestAndRedactBody(bruContent);
  const parsedData = await parseRequestViaWorker(bruFileStringWithRedactedBody);

  if (!parsedData.request) {
    parsedData.request = {};
  }
  if (!parsedData.request.body) {
    parsedData.request.body = {};
  }

  if (extractedBodyContent.json) {
    parsedData.request.body.json = extractedBodyContent.json;
  }
  if (extractedBodyContent.text) {
    parsedData.request.body.text = extractedBodyContent.text;
  }
  if (extractedBodyContent.xml) {
    parsedData.request.body.xml = extractedBodyContent.xml;
  }
  if (extractedBodyContent.sparql) {
    parsedData.request.body.sparql = extractedBodyContent.sparql;
  }
  if (extractedBodyContent.graphql) {
    if (!parsedData.request.body.graphql) {
      parsedData.request.body.graphql = {};
    }
    parsedData.request.body.graphql.query = extractedBodyContent.graphql;
  }

  return parsedData;
}

module.exports = { parseLargeRequestWithRedaction };