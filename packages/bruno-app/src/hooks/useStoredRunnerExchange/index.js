import { useEffect, useState } from 'react';

const useStoredRunnerExchange = (item) => {
  const requestUid = item?.requestUid;
  const hasSettled = item?.status === 'completed' || item?.status === 'error';
  const [stored, setStored] = useState(null);

  useEffect(() => {
    if (!requestUid || !hasSettled) return;
    let active = true;
    window.ipcRenderer
      .invoke('datastore:runner_responses:get_runner_response', { request_uid: requestUid })
      .then((exchange) => active && setStored({ requestUid, exchange }))
      .catch((error) => console.error('Failed to read the stored runner payload', error));
    return () => {
      active = false;
    };
  }, [requestUid, hasSettled]);

  const exchange = stored && stored.requestUid === requestUid ? stored.exchange : null;
  return {
    requestSent: exchange?.requestSent ?? item?.requestSent,
    responseReceived: exchange?.responseReceived ?? item?.responseReceived
  };
};

export default useStoredRunnerExchange;
