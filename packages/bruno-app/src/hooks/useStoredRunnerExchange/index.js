import { useMemo } from 'react';
import { useSqliteQuery } from '@usebruno/sqlite/web';
import { safeParseJSON } from 'utils/common';

const useStoredRunnerExchange = (item) => {
  const requestUid = item?.requestUid;
  // A row is written in two steps (request, then response) and is final once the item settles.
  // Reading earlier would refetch on every runner write, because any mutation to runner_responses
  // invalidates every active query against that table.
  const hasSettled = item?.status === 'completed' || item?.status === 'error';

  const { data } = useSqliteQuery('get_runner_response', { request_uid: requestUid }, {
    enabled: Boolean(requestUid) && hasSettled
  });

  return useMemo(() => ({
    requestSent: data?.request ? safeParseJSON(data.request) : item?.requestSent ?? null,
    responseReceived: data?.response ? safeParseJSON(data.response) : item?.responseReceived ?? null
  }), [data?.request, data?.response, item?.requestSent, item?.responseReceived]);
};

export default useStoredRunnerExchange;
