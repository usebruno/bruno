import { useMemo } from 'react';
import { useSqliteQuery, useSqliteFileBytes, useSqliteFileText } from '@usebruno/sqlite/web';
import { safeParseJSON } from 'utils/common';

// Reading a stored exchange should not leave the payload in the query cache once the
// response pane closes; a settled row never changes, so the next open re-reads it.
const NO_CACHE = { gcTime: 0 };

const decodeText = (bytes) => (bytes ? new TextDecoder().decode(bytes) : null);

// A payload over the inline limit lives on disk, so the row carries its id but no bytes.
const spilledId = (id, data) => (id && !data ? id : null);

const useStoredRunnerExchange = (item) => {
  const requestUid = item?.requestUid;
  // A row is written in two steps (request, then response) and is final once the item settles.
  // Reading earlier would refetch on every runner write, because any mutation to runner_responses
  // invalidates every active query against that table.
  const hasSettled = item?.status === 'completed' || item?.status === 'error';

  const { data: row } = useSqliteQuery('get_runner_response', { request_uid: requestUid }, {
    enabled: Boolean(requestUid) && hasSettled,
    ...NO_CACHE
  });

  const spilledRequest = useSqliteFileText(spilledId(row?.request_file_id, row?.request_data), undefined, NO_CACHE);
  const spilledResponse = useSqliteFileText(spilledId(row?.response_file_id, row?.response_data), undefined, NO_CACHE);
  const spilledBody = useSqliteFileBytes(spilledId(row?.body_file_id, row?.body_data), undefined, NO_CACHE);

  return useMemo(() => {
    const requestText = decodeText(row?.request_data) ?? spilledRequest.data ?? null;
    const responseText = decodeText(row?.response_data) ?? spilledResponse.data ?? null;
    const bodyBytes = row?.body_data ?? spilledBody.data ?? null;
    const dataBuffer = bodyBytes ? Buffer.from(bodyBytes).toString('base64') : null;
    const responseReceived = responseText ? safeParseJSON(responseText) : item?.responseReceived ?? null;

    return {
      requestSent: requestText ? safeParseJSON(requestText) : item?.requestSent ?? null,
      responseReceived:
        responseReceived && dataBuffer ? { ...responseReceived, dataBuffer } : responseReceived
    };
  }, [
    row,
    spilledRequest.data,
    spilledResponse.data,
    spilledBody.data,
    item?.requestSent,
    item?.responseReceived
  ]);
};

export default useStoredRunnerExchange;
