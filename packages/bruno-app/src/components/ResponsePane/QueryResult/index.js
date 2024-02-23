import React from 'react';
import QueryResultError from './QueryResultError';
import QueryResultMode from './QueryResultMode';

const QueryResult = ({ item, collection, data, dataBuffer, width, disableRunEventListener, headers, error }) => {
  if (error) {
    return <QueryResultError error={error} width={width} />;
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
