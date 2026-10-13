const { copyFile, writeFile } = require('node:fs/promises');
const { safeParseJSON, safeStringifyJSON, parseDataFromResponse } = require('../../utils/common');
const { getStatements, getFiles, withSecureDelete } = require('../sqlite');

const JSON_CONTENT_TYPE = 'application/json';
const MAX_RENDERABLE_RESPONSE_BYTES = 50 * 1024 * 1024;

const getContentType = (headers) => {
  const entries = headers && typeof headers === 'object' ? Object.entries(headers) : [];
  const found = entries.find(([name]) => String(name).toLowerCase() === 'content-type');
  return found ? found[1] : null;
};

const storeRunnerExchange = async ({
  requestUid,
  eventData,
  requestSent = null,
  responseReceived = null,
  disableParsingResponseJson = false
}) => {
  const write = async (data, contentType) => {
    const entry = await getFiles().write(data, { contentType });
    return entry ? entry.id : null;
  };

  try {
    let requestFileId = null;
    let responseFileId = null;
    let bodyFileId = null;

    if (requestSent) {
      requestFileId = await write(safeStringifyJSON(requestSent), JSON_CONTENT_TYPE);
    }

    if (responseReceived) {
      const { dataBuffer, data, ...rest } = responseReceived;
      if (dataBuffer) {
        bodyFileId = await write(Buffer.from(dataBuffer, 'base64'), getContentType(rest.headers));
      }
      responseFileId = await write(safeStringifyJSON({ ...rest, disableParsingResponseJson }), JSON_CONTENT_TYPE);
    }

    getStatements().execute('upsert_runner_response', {
      request_uid: requestUid,
      collection_uid: eventData.collectionUid,
      iteration_index: eventData.iterationIndex ?? 0,
      request_file_id: requestFileId,
      response_file_id: responseFileId,
      body_file_id: bodyFileId
    });
    return true;
  } catch (error) {
    console.error('[runner] failed to store exchange', requestUid, error);
    return false;
  }
};

const readPayload = (id, data) => {
  if (data) return Buffer.from(data);
  if (!id) return null;
  return getFiles().read(id);
};

const readJson = (payload) => (payload ? safeParseJSON(Buffer.from(payload).toString()) : null);

const getBodySize = (row) => {
  if (row.body_data) return row.body_data.length;
  if (!row.body_file_id) return 0;
  return getFiles().stat(row.body_file_id)?.size ?? 0;
};

const readRunnerExchange = async (requestUid) => {
  const row = getStatements().execute('get_runner_response', { request_uid: requestUid });
  if (!row) return null;

  const isDownloadOnly = getBodySize(row) > MAX_RENDERABLE_RESPONSE_BYTES;
  const [request, response, body] = await Promise.all([
    readPayload(row.request_file_id, row.request_data),
    readPayload(row.response_file_id, row.response_data),
    isDownloadOnly ? null : readPayload(row.body_file_id, row.body_data)
  ]);

  let responseReceived = null;
  if (response) {
    const { disableParsingResponseJson, ...rest } = readJson(response);
    if (isDownloadOnly) {
      responseReceived = { ...rest, data: null, dataBuffer: null, storedRequestUid: requestUid };
    } else {
      const dataBuffer = body ? Buffer.from(body) : Buffer.alloc(0);
      const { data } = parseDataFromResponse({ data: dataBuffer, headers: rest.headers || {} }, disableParsingResponseJson);
      responseReceived = { ...rest, data, dataBuffer: dataBuffer.toString('base64') };
    }
  }

  return { requestSent: readJson(request), responseReceived };
};

const saveRunnerResponseBody = async (requestUid, filePath) => {
  const row = getStatements().execute('get_runner_response', { request_uid: requestUid });
  if (!row || !row.response_file_id) throw new Error('The stored response could not be found');

  const location = row.body_file_id ? getFiles().locate(row.body_file_id) : null;
  if (location?.path) {
    await copyFile(location.path, filePath);
  } else {
    await writeFile(filePath, row.body_data ? Buffer.from(row.body_data) : Buffer.alloc(0));
  }
};

const removeStoredFiles = (rows) => {
  const ids = rows.flatMap((row) => [row.request_file_id, row.response_file_id, row.body_file_id]).filter(Boolean);
  return Promise.all(ids.map((id) => getFiles().remove(id)));
};

const clearRunnerResponses = (collectionUid) =>
  withSecureDelete(async () => {
    const rows = getStatements().execute('list_runner_response_files_for_collection', { collection_uid: collectionUid });
    getStatements().execute('delete_runner_responses_for_collection', { collection_uid: collectionUid });
    await removeStoredFiles(rows);
  });

const clearAllRunnerResponses = () =>
  withSecureDelete(async () => {
    const rows = getStatements().execute('list_runner_response_files');
    getStatements().execute('delete_runner_responses');
    await removeStoredFiles(rows);
  });

module.exports = {
  MAX_RENDERABLE_RESPONSE_BYTES,
  storeRunnerExchange,
  readRunnerExchange,
  saveRunnerResponseBody,
  clearRunnerResponses,
  clearAllRunnerResponses
};
