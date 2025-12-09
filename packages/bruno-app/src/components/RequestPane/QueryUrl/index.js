import React, { useState, useEffect, useRef, useMemo } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { requestUrlChanged, updateRequestMethod } from 'providers/ReduxStore/slices/collections';
import { cancelRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import HttpMethodSelector from './HttpMethodSelector';
import { useTheme } from 'providers/Theme';
import { IconDeviceFloppy, IconArrowRight, IconCode, IconSquareRoundedX } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import GenerateCodeItem from 'components/Sidebar/Collections/Collection/CollectionItem/GenerateCodeItem/index';
import toast from 'react-hot-toast';

const QueryUrl = ({ item, collection, handleRun }) => {
  const { theme, storedTheme } = useTheme();
  const dispatch = useDispatch();
  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const isMac = isMacOS();
  const saveShortcut = isMac ? 'Cmd + S' : 'Ctrl + S';
  const editorRef = useRef(null);
  const isGrpc = item.type === 'grpc-request';
  const isLoading = ['queued', 'sending'].includes(item.requestState);

  const [methodSelectorWidth, setMethodSelectorWidth] = useState(90);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);
  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  useEffect(() => {
    const el = document.querySelector('.method-selector-container');
    setMethodSelectorWidth(el.offsetWidth);
  }, [method]);

  const onSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const onUrlChange = (value) => {
    if (!editorRef.current?.editor) return;
    const editor = editorRef.current.editor;
    const cursor = editor.getCursor();

    const finalUrl = value?.trim() ?? value;

    dispatch(
      requestUrlChanged({
        itemUid: item.uid,
        collectionUid: collection.uid,
        url: finalUrl
      })
    );

    // Restore cursor position only if URL was trimmed
    if (finalUrl !== value) {
      setTimeout(() => {
        if (editor) {
          editor.setCursor(cursor);
        }
      }, 0);
    }
  };

  const onMethodSelect = (verb) => {
    dispatch(
      updateRequestMethod({
        method: verb,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleGenerateCode = (e) => {
    e.stopPropagation();
    if (item?.request?.url !== '' || (item.draft?.request?.url !== undefined && item.draft?.request?.url !== '')) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
  };

  const handleCancelRequest = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(cancelRequest(item.cancelTokenUid, item, collection));
  };

  return (
    <StyledWrapper className="flex items-center">
      <div className="unified-input-container">
        <div className="flex flex-1 items-center h-full method-selector-container">
          {isGrpc ? (
            <div className="flex items-center justify-center h-full w-16">
              <span className="text-xs text-indigo-500 font-bold">gRPC</span>
            </div>
          ) : (
            <HttpMethodSelector method={method} onMethodSelect={onMethodSelect} />
          )}
        </div>
        <div
          id="request-url"
          className="flex items-center flex-grow input-container h-full"
          style={{
            color: 'yellow',
            width: `calc(100% - ${methodSelectorWidth}px)`,
            maxWidth: `calc(100% - ${methodSelectorWidth}px)`
          }}
        >
          <SingleLineEditor
            ref={editorRef}
            value={url}
            onSave={(finalValue) => onSave(finalValue)}
            theme={storedTheme}
            onChange={(newValue) => onUrlChange(newValue)}
            onRun={handleRun}
            collection={collection}
            highlightPathParams={true}
            item={item}
            showNewlineArrow={true}
          />
          <div className="flex items-center h-full cursor-pointer mx-2" id="send-request" onClick={handleRun}>
            <div
              title="Generate Code"
              className="infotip mr-3"
              onClick={(e) => {
                handleGenerateCode(e);
              }}
            >
              <IconCode color={theme.requestTabs.icon.color} strokeWidth={1.5} size={20} className="cursor-pointer" />
              <span className="infotiptext text-xs">Generate Code</span>
            </div>
            <div
              title="Save Request"
              className="infotip"
              onClick={(e) => {
                e.stopPropagation();
                if (!hasChanges) return;
                onSave();
              }}
            >
              <IconDeviceFloppy
                color={hasChanges ? theme.colors.text.yellow : theme.requestTabs.icon.color}
                strokeWidth={1.5}
                size={20}
                className={`${hasChanges ? 'cursor-pointer' : 'cursor-default'}`}
              />
              <span className="infotiptext text-xs">
                Save <span className="shortcut">({saveShortcut})</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      {isLoading || item.response?.stream?.running ? (
        <button
          type="button"
          className="cancel-button"
          onClick={handleCancelRequest}
          data-testid="cancel-request-icon"
        >
          Cancel
        </button>
      ) : (
        <button
          type="button"
          className="send-button"
          onClick={handleRun}
          data-testid="send-arrow-icon"
        >
          Send
        </button>
      )}
      {generateCodeItemModalOpen && (
        <GenerateCodeItem
          collectionUid={collection.uid}
          item={item}
          onClose={() => setGenerateCodeItemModalOpen(false)}
        />
      )}
    </StyledWrapper>
  );
};

export default QueryUrl;
