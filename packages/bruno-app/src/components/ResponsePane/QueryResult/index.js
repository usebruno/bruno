import React, { useState } from 'react';
import QueryResultError from './QueryResultError';
import QueryResultMode from './QueryResultMode';
import QueryResultSizeWarning from 'components/ResponsePane/QueryResult/QueryResultSizeWarning';

const QueryResult = ({ item, collection, data, dataBuffer, width, disableRunEventListener, headers, error }) => {
  const [dismissedSizeWarning, setDismissedSizeWarning] = useState(false);

  if (error) {
    return <QueryResultError error={error} width={width} />;
  }

  if (item.response?.size > 5_000_000 && !dismissedSizeWarning) {
    const dismissWarning = () => {
      setDismissedSizeWarning(true);
    };
    return <QueryResultSizeWarning size={item.response.size} width={width} dismissWarning={dismissWarning} />;
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
