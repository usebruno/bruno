import { debounce } from 'lodash';
import QueryResultFilter from './QueryResultFilter';
import { JSONPath } from 'jsonpath-plus';
import React from 'react';
import classnames from 'classnames';
import { getContentType, safeStringifyJSON, safeParseXML } from 'utils/common';
import QueryResultPreview from './QueryResultPreview';

import StyledWrapper from './StyledWrapper';
import { useState } from 'react';
import { useMemo } from 'react';
import { useEffect } from 'react';
import { useTheme } from 'providers/Theme/index';
import { getMonacoModeFromContent } from 'utils/monaco/monacoUtils';

const formatResponse = (data, mode, filter) => {
  if (data === undefined) {
    return '';
  }

  if (mode.includes('json')) {
    if (filter) {
      try {
        data = JSONPath({ path: filter, json: data });
      } catch (e) {
        console.warn('Could not filter with JSONPath.', e.message);
      }
    }

    return safeStringifyJSON(data, true);
  }

  if (mode.includes('xml')) {
    let parsed = safeParseXML(data, { collapseContent: true });
    if (typeof parsed === 'string') {
      return parsed;
    }

    return safeStringifyJSON(parsed, true);
  }

  if (typeof data === 'string') {
    return data;
  }

  return safeStringifyJSON(data);
};

const QueryResult = ({ item, collection, data, dataBuffer, width, disableRunEventListener, headers, error }) => {
  const contentType = getContentType(headers);
  const mode = getMonacoModeFromContent(contentType, data);
  const [filter, setFilter] = useState(null);
  const formattedData = formatResponse(data, mode, filter);
  const { displayedTheme } = useTheme();

  const debouncedResultFilterOnChange = debounce((e) => {
    setFilter(e.target.value);
  }, 250);

  const allowedPreviewModes = useMemo(() => {
    // Always show raw
    const allowedPreviewModes = ['raw'];

    if (mode.includes('html') && typeof data === 'string') {
      allowedPreviewModes.unshift('preview-web');
    } else if (mode.includes('image')) {
      allowedPreviewModes.unshift('preview-image');
    } else if (contentType.includes('pdf')) {
      allowedPreviewModes.unshift('preview-pdf');
    }

    return allowedPreviewModes;
  }, [mode, data, formattedData]);

  const [previewTab, setPreviewTab] = useState(allowedPreviewModes[0]);
  // Ensure the active Tab is always allowed
  useEffect(() => {
    if (!allowedPreviewModes.includes(previewTab)) {
      setPreviewTab(allowedPreviewModes[0]);
    }
  }, [previewTab, allowedPreviewModes]);

  const tabs = useMemo(() => {
    if (allowedPreviewModes.length === 1) {
      return null;
    }

    return allowedPreviewModes.map((previewMode) => (
      <div
        className={classnames('select-none capitalize', previewMode === previewTab ? 'active' : 'cursor-pointer')}
        role="tab"
        onClick={() => setPreviewTab(previewMode)}
        key={previewMode}
      >
        {previewMode.replace(/-(.*)/, ' ')}
      </div>
    ));
  }, [allowedPreviewModes, previewTab]);

  const queryFilterEnabled = useMemo(() => mode.includes('json'), [mode]);

  return (
    <StyledWrapper
      className="w-full h-full relative"
      style={{ maxWidth: width }}
      queryFilterEnabled={queryFilterEnabled}
    >
      <div className="flex justify-end gap-2 text-xs" role="tablist">
        {tabs}
      </div>
      {error ? (
        <div>
          <div className="text-red-500">{error}</div>

          {error && typeof error === 'string' && error.toLowerCase().includes('self signed certificate') ? (
            <div className="mt-6 muted text-xs">
              You can disable SSL verification in the Preferences. <br />
              To open the Preferences, click on the gear icon in the bottom left corner.
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <QueryResultPreview
            previewTab={previewTab}
            data={data}
            dataBuffer={dataBuffer}
            formattedData={formattedData}
            item={item}
            contentType={contentType}
            mode={mode}
            collection={collection}
            allowedPreviewModes={allowedPreviewModes}
            disableRunEventListener={disableRunEventListener}
            displayedTheme={displayedTheme}
          />
          {queryFilterEnabled && <QueryResultFilter onChange={debouncedResultFilterOnChange} mode={mode} />}
        </>
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
