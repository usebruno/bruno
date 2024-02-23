import { getContentType, safeParseXML, safeStringifyJSON } from 'utils/common';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'providers/Theme';
import { debounce } from 'lodash';
import classnames from 'classnames';
import StyledWrapper from 'components/ResponsePane/QueryResult/QueryResultMode/StyledWrapper';
import QueryResultPreview from 'components/ResponsePane/QueryResult/QueryResultViewer';
import QueryResultFilter from 'components/ResponsePane/QueryResult/QueryResultFilter';
import { JSONPath } from 'jsonpath-plus';

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

const QueryResultMode = ({ item, collection, data, dataBuffer, width, disableRunEventListener, headers }) => {
  const contentType = getContentType(headers);
  const mode = getCodeMirrorModeBasedOnContentType(contentType, data);
  const [filter, setFilter] = useState(null);
  const formattedData = formatResponse(data, mode, filter);

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
      />
      {queryFilterEnabled && <QueryResultFilter onChange={setFilter} mode={mode} />}
    </StyledWrapper>
  );
};

export default QueryResultMode;
