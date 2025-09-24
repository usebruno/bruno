import React, { useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { IconChevronDown } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor';
import { updateCollectionRequestScript, updateCollectionResponseScript } from 'providers/ReduxStore/slices/collections';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const Script = ({ collection }) => {
  const dispatch = useDispatch();
  const requestScript = get(collection, 'root.request.script.req', '');
  const responseScript = get(collection, 'root.request.script.res', '');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // State for collapsible sections - both start expanded
  const [isPreRequestExpanded, setIsPreRequestExpanded] = useState(true);
  const [isPostResponseExpanded, setIsPostResponseExpanded] = useState(true);

  const onRequestScriptEdit = (value) => {
    dispatch(
      updateCollectionRequestScript({
        script: value,
        collectionUid: collection.uid
      })
    );
  };

  const onResponseScriptEdit = (value) => {
    dispatch(
      updateCollectionResponseScript({
        script: value,
        collectionUid: collection.uid
      })
    );
  };

  const handleSave = () => {
    dispatch(saveCollectionRoot(collection.uid));
  };

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">
        Write pre and post-request scripts that will run before and after any request in this collection is sent.
      </div>

      {/* Pre Request Section */}
      <div className="script-section">
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
                onEdit={onRequestScriptEdit}
                mode="javascript"
                onSave={handleSave}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
                showHintsFor={['req', 'bru']}
              />
            </div>
          </div>
        )}
      </div>

      {/* Post Response Section */}
      <div className="script-section">
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
                onEdit={onResponseScriptEdit}
                mode="javascript"
                onSave={handleSave}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
                showHintsFor={['req', 'res', 'bru']}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-12">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Script;
