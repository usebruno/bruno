export const sendNetworkRequest = async (item, collectionUid, environment) => {
  return new Promise((resolve, reject) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      const timeStart = Date.now();
      sendHttpRequest(item, collectionUid, environment)
        .then((response) => {
          const timeEnd = Date.now();
          resolve({
            state: 'success',
            data: response.data,
            headers: Object.entries(response.headers),
            size: response.headers['content-length'] || 0,
            status: response.status,
            statusText: response.statusText,
            duration: timeEnd - timeStart
          });
        })
        .catch((err) => reject(err));
    }
  });
};

const sendHttpRequest = async (item, collectionUid, environment) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('send-http-request', item, collectionUid, environment)
      .then(resolve)
      .catch(reject);
  });
};

export const cancelNetworkRequest = async (cancelTokenUid) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('cancel-http-request', cancelTokenUid)
      .then(resolve)
      .catch(reject);
  });
};
