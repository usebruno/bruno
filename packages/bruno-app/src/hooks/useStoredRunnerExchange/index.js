import { useEffect, useState } from 'react';

const useStoredRunnerExchange = (item, maxPreviewSizeMB) => {
  const requestUid = item?.requestUid;
  const hasSettled = item?.status === 'completed' || item?.status === 'error';
  const [stored, setStored] = useState(null);

  useEffect(() => {
    if (!requestUid || !hasSettled) return;
    let active = true;
    window.ipcRenderer
      .invoke('datastore:runner_responses:get_runner_response', { request_uid: requestUid, max_preview_size_mb: maxPreviewSizeMB })
      .then((exchange) => active && setStored({ requestUid, exchange }))
      .catch((error) => console.error('Failed to read the stored runner payload', error));
    return () => {
      active = false;
    };
  }, [requestUid, hasSettled, maxPreviewSizeMB]);

  const exchange = stored && stored.requestUid === requestUid ? stored.exchange : null;
  return {
    requestSent: exchange?.requestSent ?? item?.requestSent,
    responseReceived: exchange?.responseReceived ?? item?.responseReceived
  };
};

export default useStoredRunnerExchange;
