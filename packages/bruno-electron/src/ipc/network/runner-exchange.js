const { storeRunnerExchange } = require('../../services/runner-exchange');

const createRunnerExchangeEmitters = (mainWindow) => {
  const sendRunnerRequestSent = async ({ requestUid, requestSent, eventData }) => {
    const stored = await storeRunnerExchange({ requestUid, eventData, requestSent });

    mainWindow.webContents.send('main:run-folder-event', {
      type: 'request-sent',
      ...(stored ? {} : { requestSent }),
      ...eventData
    });
  };

  const sendRunnerResponseReceived = async ({ requestUid, responseReceived, error, eventData, disableParsingResponseJson }) => {
    const stored = await storeRunnerExchange({ requestUid, eventData, responseReceived, disableParsingResponseJson });

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

module.exports = { createRunnerExchangeEmitters };
