import React, { useState, useEffect, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { requestUrlChanged, updateRequestMethod } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import HttpMethodSelector from './HttpMethodSelector';
import { useTheme } from 'providers/Theme';
import { IconDeviceFloppy, IconArrowRight, IconCode } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import { isMacOS } from 'utils/common/platform';
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

  const [methodSelectorWidth, setMethodSelectorWidth] = useState(90);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);

  useEffect(() => {
    const el = document.querySelector('.method-selector-container');
    setMethodSelectorWidth(el.offsetWidth);
  }, [method]);

  const onSave = (finalValue) => {
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
    if (item.request.url !== '' || (item.draft?.request.url !== undefined && item.draft?.request.url !== '')) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
  };

  return (
    <StyledWrapper className="flex items-center">
      <div className="flex items-center h-full method-selector-container">
        <HttpMethodSelector method={method} onMethodSelect={onMethodSelect} />
      </div>
      <div
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
        />
        <div className="flex items-center h-full mr-2 cursor-pointer" id="send-request" onClick={handleRun}>
          <div
            className="infotip mr-3"
            onClick={(e) => {
              handleGenerateCode(e);
            }}
          >
            <IconCode
              color={theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={'cursor-pointer'}
            />
            <span className="infotiptext text-xs">
              Generate Code
            </span>
          </div>
          <div
            className="infotip mr-3"
            onClick={(e) => {
              e.stopPropagation();
              if (!item.draft) return;
              onSave();
            }}
          >
            <IconDeviceFloppy
              color={item.draft ? theme.colors.text.yellow : theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={`${item.draft ? 'cursor-pointer' : 'cursor-default'}`}
            />
            <span className="infotiptext text-xs">
              Save <span className="shortcut">({saveShortcut})</span>
            </span>
          </div>
          <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={22} />
        </div>
      </div>
      {generateCodeItemModalOpen && (
        <GenerateCodeItem collection={collection} item={item} onClose={() => setGenerateCodeItemModalOpen(false)} />
      )}
    </StyledWrapper>
  );
};

export default QueryUrl;
