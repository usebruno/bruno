const { safeStringifyJSON } = require('../../utils/common');
const { getStatements } = require('../../services/sqlite');

const storeRunnerExchange = ({ requestUid, eventData, request = null, response = null }) => {
  try {
    getStatements().execute('upsert_runner_response', {
      request_uid: requestUid,
      collection_uid: eventData.collectionUid,
      request,
      response
    });
    return true;
  } catch (error) {
    console.error('[runner] failed to store exchange', requestUid, error);
    return false;
  }
};

const createRunnerExchangeEmitters = (mainWindow) => {
  const sendRunnerRequestSent = ({ requestUid, requestSent, eventData }) => {
    const stored = storeRunnerExchange({ requestUid, eventData, request: safeStringifyJSON(requestSent) });

    mainWindow.webContents.send('main:run-folder-event', {
      type: 'request-sent',
      ...(stored ? {} : { requestSent }),
      ...eventData
    });
  };

  const sendRunnerResponseReceived = ({ requestUid, responseReceived, error, eventData }) => {
    const stored = storeRunnerExchange({ requestUid, eventData, response: safeStringifyJSON(responseReceived) });

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
