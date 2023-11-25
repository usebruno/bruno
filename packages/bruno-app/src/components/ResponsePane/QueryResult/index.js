import React from 'react';
import classnames from 'classnames';
import { getContentType, safeStringifyJSON, safeParseXML } from 'utils/common';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import QueryResultPreview from './QueryResultPreview';

import StyledWrapper from './StyledWrapper';
import { useState } from 'react';
import { useMemo } from 'react';
import { useEffect } from 'react';
import { useTheme } from 'providers/Theme/index';

const formatResponse = (data, mode) => {
  if (data === undefined) {
    return '';
  }

  if (mode.includes('json')) {
    return safeStringifyJSON(data, true);
  }

  if (mode.includes('xml')) {
    let parsed = safeParseXML(data, { collapseContent: true });
    if (typeof parsed === 'string') {
      return parsed;
    }

    return safeStringifyJSON(parsed, true);
  }

  if (['text', 'html'].includes(mode) || typeof data === 'string') {
    return data;
  }

  return safeStringifyJSON(data);
};

const QueryResult = ({ item, collection, data, dataBuffer, width, disableRunEventListener, headers, error }) => {
  const contentType = getContentType(headers);
  const mode = getCodeMirrorModeBasedOnContentType(contentType);
  const formattedData = formatResponse(data, mode);
  const { storedTheme } = useTheme();

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

  return (
    <StyledWrapper className="w-full h-full" style={{ maxWidth: width }}>
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
          storedTheme={storedTheme}
        />
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
