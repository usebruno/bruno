import { debounce } from 'lodash';
import QueryResultFilter from './QueryResultFilter';
import { JSONPath } from 'jsonpath-plus';
import React from 'react';
import classnames from 'classnames';
import { getContentType, safeStringifyJSON, safeParseXML } from 'utils/common';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import QueryResultPreview from './QueryResultPreview';
import StyledWrapper from './StyledWrapper';
import { useState, useMemo, useEffect } from 'react';
import { useTheme } from 'providers/Theme/index';
import { uuid } from 'utils/common/index';
import { IconAlertCircle, IconX } from '@tabler/icons';
import Modal from 'components/Modal';
import ToolHint from 'components/ToolHint';

const formatResponse = (data, mode, filter) => {
  if (data === undefined) {
    return '';
  }

  if (data === null) {
    return 'null';
  }

  if (mode.includes('json')) {
    let isValidJSON = false;

    try {
      isValidJSON = typeof JSON.parse(JSON.stringify(data)) === 'object'
    } catch (error) {
      console.log('Error parsing JSON: ', error.message);
    }

    if (!isValidJSON && typeof data === 'string') {
      return data;
    }

    if (filter) {
      try {
        data = JSONPath({ path: filter, json: data });
      } catch (e) {
        console.warn('Could not apply JSONPath filter:', e.message);
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

  return safeStringifyJSON(data, true);
};

const QueryResult = ({ item, collection, data, dataBuffer, width, disableRunEventListener, headers, error }) => {
  const contentType = getContentType(headers);
  const mode = getCodeMirrorModeBasedOnContentType(contentType, data);
  const [filter, setFilter] = useState(null);
  const formattedData = formatResponse(data, mode, filter);
  const { displayedTheme } = useTheme();
  const [showScriptError, setShowScriptError] = useState(false);

  const debouncedResultFilterOnChange = debounce((e) => {
    setFilter(e.target.value);
  }, 250);

  const allowedPreviewModes = useMemo(() => {
    // Always show raw
    const allowedPreviewModes = [{ mode: 'raw', name: 'Raw', uid: uuid() }];

    if (mode.includes('html') && typeof data === 'string') {
      allowedPreviewModes.unshift({ mode: 'preview-web', name: 'Web', uid: uuid() });
    } else if (mode.includes('image')) {
      allowedPreviewModes.unshift({ mode: 'preview-image', name: 'Image', uid: uuid() });
    } else if (contentType.includes('pdf')) {
      allowedPreviewModes.unshift({ mode: 'preview-pdf', name: 'PDF', uid: uuid() });
    } else if (contentType.includes('audio')) {
      allowedPreviewModes.unshift({ mode: 'preview-audio', name: 'Audio', uid: uuid() });
    } else if (contentType.includes('video')) {
      allowedPreviewModes.unshift({ mode: 'preview-video', name: 'Video', uid: uuid() });
    }

    return allowedPreviewModes;
  }, [mode, data, formattedData]);

  const [previewTab, setPreviewTab] = useState(allowedPreviewModes[0]);
  // Ensure the active Tab is always allowed
  useEffect(() => {
    if (!allowedPreviewModes.find((previewMode) => previewMode?.uid == previewTab?.uid)) {
      setPreviewTab(allowedPreviewModes[0]);
    }
  }, [previewTab, allowedPreviewModes]);

  const tabs = useMemo(() => {
    if (allowedPreviewModes.length === 1) {
      return null;
    }

    return allowedPreviewModes.map((previewMode) => (
      <div
        className={classnames(
          'select-none capitalize',
          previewMode?.uid === previewTab?.uid ? 'active' : 'cursor-pointer'
        )}
        role="tab"
        onClick={() => setPreviewTab(previewMode)}
        key={previewMode?.uid}
      >
        {previewMode?.name}
      </div>
    ));
  }, [allowedPreviewModes, previewTab]);

  const queryFilterEnabled = useMemo(() => mode.includes('json'), [mode]);

  const renderScriptError = () => {
    if (!item?.hasPostResponseError) return null;

    const toolhintId = `script-error-${item.uid}`;

    return (
      <>
        <div 
          id={toolhintId}
          className="absolute top-4 right-4 cursor-pointer"
          onClick={() => setShowScriptError(true)}
        >
          <div className="flex items-center bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1.5 rounded-md transition-colors">
            <IconAlertCircle size={15} strokeWidth={1.5} className="stroke-current" />
          </div>
        </div>
        <ToolHint
          toolhintId={toolhintId}
          text="Script execution error occurred"
          place="left"
        />

        {showScriptError && (
          <Modal
            size="md"
            title={
              <div className="flex items-center text-red-400">
                <IconAlertCircle size={16} strokeWidth={1.5} className="stroke-current" />
                <span className="ml-2">Script Error</span>
              </div>
            }
            handleCancel={() => setShowScriptError(false)}
            hideFooter={true}
          >
            <div className="py-2">
              <div className="bg-zinc-900 rounded-md border border-zinc-800 overflow-auto max-h-[400px]">
                <pre className="font-mono text-[12px] leading-5 text-gray-300/90 p-4 whitespace-pre-wrap break-all">
                  {item.postResponseErrorMessage}
                </pre>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  };

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
        <div className="h-full relative">
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
          {queryFilterEnabled && (
            <QueryResultFilter filter={filter} onChange={debouncedResultFilterOnChange} mode={mode} />
          )}
          {renderScriptError()}
        </div>
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
