import React, { useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { IconChevronDown } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor';
import { updateRequestScript, updateResponseScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const Script = ({ item, collection }) => {
  const dispatch = useDispatch();
  const requestScript = item.draft ? get(item, 'draft.request.script.req') : get(item, 'request.script.req');
  const responseScript = item.draft ? get(item, 'draft.request.script.res') : get(item, 'request.script.res');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // State for collapsible sections - start collapsed to test functionality
  const [isPreRequestExpanded, setIsPreRequestExpanded] = useState(false);
  const [isPostResponseExpanded, setIsPostResponseExpanded] = useState(false);

  const onRequestScriptEdit = (value) => {
    dispatch(
      updateRequestScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onResponseScriptEdit = (value) => {
    dispatch(
      updateResponseScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="flex flex-col flex-1">
        {/* Pre Request Section */}
        <div className={`script-section ${isPreRequestExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="script-header" onClick={() => setIsPreRequestExpanded(!isPreRequestExpanded)}>
          <div className="title text-xs">Pre Request</div>
          <IconChevronDown
            className="w-4 h-4 ml-auto chevron-icon"
            style={{
              transform: `rotate(${isPreRequestExpanded ? '180deg' : '0deg'})`,
              transition: 'transform 0.2s ease-in-out',
            }}
          />
        </div>
        {isPreRequestExpanded && (
          <div className="script-content">
            <div className="script-editor-container">
              <CodeEditor
                collection={collection}
                value={requestScript || ''}
                theme={displayedTheme}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
                onEdit={onRequestScriptEdit}
                mode="javascript"
                onRun={onRun}
                onSave={onSave}
                showHintsFor={['req', 'bru']}
              />
            </div>
          </div>
        )}
      </div>

      {/* Post Response Section */}
        <div className={`script-section ${isPostResponseExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="script-header" onClick={() => setIsPostResponseExpanded(!isPostResponseExpanded)}>
          <div className="title text-xs">Post Response</div>
          <IconChevronDown
            className="w-4 h-4 ml-auto chevron-icon"
            style={{
              transform: `rotate(${isPostResponseExpanded ? '180deg' : '0deg'})`,
              transition: 'transform 0.2s ease-in-out',
            }}
          />
        </div>
        {isPostResponseExpanded && (
          <div className="script-content">
            <div className="script-editor-container">
              <CodeEditor
                collection={collection}
                value={responseScript || ''}
                theme={displayedTheme}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
                onEdit={onResponseScriptEdit}
                mode="javascript"
                onRun={onRun}
                onSave={onSave}
                showHintsFor={['req', 'res', 'bru']}
              />
            </div>
          </div>
        )}
      </div>
      </div>
    </StyledWrapper>
  );
};

export default Script;
