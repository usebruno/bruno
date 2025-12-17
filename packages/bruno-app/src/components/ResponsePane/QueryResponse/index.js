import React, { useEffect, useState } from 'react';
import QueryResult from '../QueryResult';
import { useInitialResponseFormat, useResponsePreviewFormatOptions } from '../QueryResult/index';
import QueryResultTypeSelector from '../QueryResult/QueryResultTypeSelector/index';
import StyledWrapper from './StyledWrapper';
import classnames from 'classnames';

const QueryResponse = ({
  item,
  collection,
  data,
  dataBuffer,
  disableRunEventListener,
  headers,
  error
}) => {
  const { initialFormat, initialTab } = useInitialResponseFormat(dataBuffer, headers);
  const previewFormatOptions = useResponsePreviewFormatOptions(dataBuffer, headers);
  const [selectedFormat, setSelectedFormat] = useState('raw');
  const [selectedTab, setSelectedTab] = useState('editor');

  useEffect(() => {
    if (initialFormat !== null && initialTab !== null) {
      setSelectedFormat(initialFormat);
      setSelectedTab(initialTab);
    }
  }, [initialFormat, initialTab]);
  return (
    <StyledWrapper>
      <div className="flex items-center justify-end p-2">
        <QueryResultTypeSelector
          formatOptions={previewFormatOptions}
          formatValue={selectedFormat}
          onFormatChange={(newFormat) => {
            setSelectedFormat(newFormat);
          }}
          onPreviewTabSelect={() => {
            setSelectedTab((prev) => prev === 'editor' ? 'preview' : 'editor');
          }}
          selectedTab={selectedTab}
        />
      </div>
      <div className={classnames('flex-1 query-response-content', selectedTab === 'editor' ? 'px-2 py-1' : '')}>
        <QueryResult
          item={item}
          collection={collection}
          data={data}
          dataBuffer={dataBuffer}
          disableRunEventListener={disableRunEventListener}
          headers={headers}
          error={error}
          selectedFormat={selectedFormat}
          selectedTab={selectedTab}
        />
      </div>
    </StyledWrapper>
  );
};

export default QueryResponse;
