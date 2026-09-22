const { safeStringifyJSON } = require('../../utils/common');
const { getStatements, getFiles } = require('../sqlite');

const JSON_CONTENT_TYPE = 'application/json';

const getContentType = (headers) => {
  const entries = headers && typeof headers === 'object' ? Object.entries(headers) : [];
  const found = entries.find(([name]) => String(name).toLowerCase() === 'content-type');
  return found ? found[1] : null;
};

const storeRunnerExchange = async ({ requestUid, eventData, requestSent = null, responseReceived = null }) => {
  const statements = getStatements();
  const files = getFiles();
  if (!statements || !files) return false;

  const write = async (data, contentType) => {
    const entry = await files.write(data, { contentType });
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
      const { dataBuffer, ...rest } = responseReceived;
      // The body gets its own row so it can be served over bruno-file:// rather than
      // carried as base64 inside the response json.
      if (dataBuffer) {
        bodyFileId = await write(Buffer.from(dataBuffer, 'base64'), getContentType(rest.headers));
      }
      responseFileId = await write(safeStringifyJSON(rest), JSON_CONTENT_TYPE);
    }

    statements.execute('upsert_runner_response', {
      request_uid: requestUid,
      collection_uid: eventData.collectionUid,
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

const createRunnerExchangeEmitters = (mainWindow) => {
  const sendRunnerRequestSent = async ({ requestUid, requestSent, eventData }) => {
    const stored = await storeRunnerExchange({ requestUid, eventData, requestSent });

    mainWindow.webContents.send('main:run-folder-event', {
      type: 'request-sent',
      ...(stored ? {} : { requestSent }),
      ...eventData
    });
  };

  const sendRunnerResponseReceived = async ({ requestUid, responseReceived, error, eventData }) => {
    const stored = await storeRunnerExchange({ requestUid, eventData, responseReceived });

    mainWindow.webContents.send('main:run-folder-event', {
      type: 'response-received',
      ...(error ? { error } : {}),
      responseReceived: stored
        ? {
            status: responseReceived?.status,
            statusText: responseReceived?.statusText
          }
        : responseReceived,
      ...eventData
    });
  };

  return { sendRunnerRequestSent, sendRunnerResponseReceived };
};

module.exports = { storeRunnerExchange, createRunnerExchangeEmitters };
