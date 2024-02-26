import React, { useEffect, useState } from 'react';
import QueryResultError from './QueryResultError';
import QueryResultMode from './QueryResultMode';
import QueryResultSizeWarning from 'components/ResponsePane/QueryResult/QueryResultSizeWarning';
import { getResponseBody } from 'utils/network';

const QueryResult = ({ item, collection, width, disableRunEventListener, headers, error }) => {
  const [dismissedSizeWarning, setDismissedSizeWarning] = useState(false);
  const [{ data, dataBuffer }, setData] = useState({ data: null, dataBuffer: null });

  const showSizeWarning = item.response?.size > 5_000_000 && !dismissedSizeWarning;
  useEffect(() => {
    if (error || showSizeWarning) {
      return;
    }

    const abortController = new AbortController();
    (async () => {
      const data = await getResponseBody(item.uid);
      if (!abortController.signal.aborted) {
        setData(data);
      }
    })();

    return () => {
      abortController.abort();
      setData({ data: null, dataBuffer: null });
    };
  }, [item.response, showSizeWarning]);

  if (error) {
    return <QueryResultError error={error} width={width} />;
  }

  if (showSizeWarning) {
    const dismissWarning = () => {
      setDismissedSizeWarning(true);
    };
    return <QueryResultSizeWarning size={item.response.size} width={width} dismissWarning={dismissWarning} />;
  }

  if (data === null && dataBuffer === null) {
    return <div className={'mt-4'}>Loading response...</div>;
  }

  return (
    <QueryResultMode
      item={item}
      collection={collection}
      data={data}
      dataBuffer={dataBuffer}
      width={width}
      disableRunEventListener={disableRunEventListener}
      headers={headers}
    />
  );
};

export default QueryResult;
