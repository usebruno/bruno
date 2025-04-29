import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { IconEdit, IconX, IconFileText } from '@tabler/icons';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const docs = item.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  const preferences = useSelector((state) => state.app.preferences);

  const toggleViewMode = () => {
    setIsEditing((prev) => !prev);
  };

  const onEdit = (value) => {
    dispatch(
      updateRequestDocs({
        itemUid: item.uid,
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const handleDiscardChanges = () => {
    dispatch(
      updateRequestDocs({
        itemUid: item.uid,
        collectionUid: collection.uid,
        docs: docs
      })
    );
    toggleViewMode();
  };

  const onSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
    toggleViewMode();
  };

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper className="flex flex-col h-full w-full relative">
      <div className="docs-header">
        <div className="flex items-center">
          <IconFileText size={20} strokeWidth={1.5} />
          <span className="ml-2">Documentation</span>
        </div>
        <div className="flex items-center">
          {isEditing ? (
            <button 
              className="close-button" 
              onClick={handleDiscardChanges} 
              title="Close"
            >
              <IconX size={18} strokeWidth={1.5} />
            </button>
          ) : (
            <div className="editing-mode" role="tab" onClick={toggleViewMode} title="Edit">
              <IconEdit className="cursor-pointer" size={18} strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <>
          <div className="flex-1 editor-container">
            <CodeEditor
              collection={collection}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              value={docs || ''}
              onEdit={onEdit}
              onSave={onSave}
              mode="application/text"
              lineNumbers={true}
            />
          </div>
          <div className="docs-footer">
            <button 
              className="save-button"
              onClick={onSave}
            >
              Save
            </button>
          </div>
        </>
      ) : (
        <div className="markdown-container flex-1 overflow-auto">
          {docs?.length > 0 ? (
            <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
          ) : (
            <div className="text-gray-400 italic p-2">No documentation available. Click the edit button to add documentation.</div>
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

export default Documentation;
