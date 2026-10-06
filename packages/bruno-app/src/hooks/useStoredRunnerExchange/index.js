import { useEffect, useMemo, useState } from 'react';
import { safeParseJSON } from 'utils/common';

const useStoredRunnerExchange = (item) => {
  const requestUid = item?.requestUid;
  // A row is written in two steps (request, then response) and is only final once the item settles.
  const hasSettled = item?.status === 'completed' || item?.status === 'error';
  const [stored, setStored] = useState(null);

  useEffect(() => {
    if (!requestUid || !hasSettled) return undefined;
    let active = true;
    window.ipcRenderer
      .invoke('datastore:runner_responses:get_runner_response', { request_uid: requestUid })
      .then((row) => {
        if (active) setStored({ requestUid, row });
      })
      .catch((error) => {
        console.error('Failed to read the stored runner payload', error);
      });
    return () => {
      active = false;
    };
  }, [requestUid, hasSettled]);

  const data = stored && stored.requestUid === requestUid ? stored.row : null;

  return useMemo(() => ({
    requestSent: data?.request ? safeParseJSON(data.request) : item?.requestSent ?? null,
    responseReceived: data?.response ? safeParseJSON(data.response) : item?.responseReceived ?? null
  }), [data?.request, data?.response, item?.requestSent, item?.responseReceived]);
};

export default useStoredRunnerExchange;
