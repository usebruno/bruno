import React, { useEffect, useRef, useState } from 'react';
import QueryResult from '../QueryResult';
import { useInitialResponseFormat, useResponsePreviewFormatOptions, usePreferredFallbackFormat } from '../QueryResult/index';
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
  error,
  hideResultTypeSelector,
  docKey
}) => {
  const { initialFormat, initialTab } = useInitialResponseFormat(dataBuffer, headers);
  const previewFormatOptions = useResponsePreviewFormatOptions(dataBuffer, headers);
  const fallbackFormat = usePreferredFallbackFormat();
  const [selectedFormat, setSelectedFormat] = useState(fallbackFormat);
  const [selectedTab, setSelectedTab] = useState('editor');
  const [filter, setFilter] = useState('');
  const [filterExpanded, setFilterExpanded] = useState(false);

  // Set once the user picks a format or view tab, so that a change of the detection
  // preference doesn't override it. A new response starts from the detected defaults again.
  const hasManualSelection = useRef(false);

  useEffect(() => {
    hasManualSelection.current = false;
  }, [dataBuffer, headers]);

  useEffect(() => {
    if (hasManualSelection.current) {
      return;
    }
    if (initialFormat !== null && initialTab !== null) {
      setSelectedFormat(initialFormat);
      setSelectedTab(initialTab);
    }
  }, [initialFormat, initialTab]);
  return (
    <StyledWrapper>
      {!hideResultTypeSelector && (
        <div className="flex items-center justify-end p-2 result-type-selector">

          <QueryResultTypeSelector
            formatOptions={previewFormatOptions}
            formatValue={selectedFormat}
            onFormatChange={(newFormat) => {
              hasManualSelection.current = true;
              setSelectedFormat(newFormat);
            }}
            onPreviewTabSelect={() => {
              hasManualSelection.current = true;
              setSelectedTab((prev) => prev === 'editor' ? 'preview' : 'editor');
            }}
            selectedTab={selectedTab}
            isActiveTab={true}
          />
        </div>
      )}
      <div className={classnames('flex-1 result-content', selectedTab === 'editor' ? 'px-2 py-1' : '')}>
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
          filter={filter}
          filterExpanded={filterExpanded}
          onFilterChange={setFilter}
          onFilterExpandChange={setFilterExpanded}
          docKey={docKey}
        />
      </div>
    </StyledWrapper>
  );
};

export default QueryResponse;
