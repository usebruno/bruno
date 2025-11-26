import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateCollectionDocs, deleteCollectionDraft } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { IconPencil, IconX, IconBook2, IconArrowsHorizontal, IconArrowsDiff } from '@tabler/icons';

const Docs = ({ collection, isExpanded, onToggleExpand }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const docs = collection.draft?.root ? get(collection, 'draft.root.docs', '') : get(collection, 'root.docs', '');
  const preferences = useSelector((state) => state.app.preferences);

  const toggleViewMode = () => {
    setIsEditing((prev) => !prev);
  };

  const onEdit = (value) => {
    dispatch(
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const handleDiscardChanges = () => {
    dispatch((
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: docs
      }))
    );
    toggleViewMode();
  }

  const onSave = () => {
    dispatch(saveCollectionSettings(collection.uid));
    toggleViewMode();
  }

  return (
    <StyledWrapper className="h-full w-full relative flex flex-col">
      <div className="docs-card">
        <div className="flex flex-row w-full justify-between items-start">
          <div className="flex items-start flex-1">
            <div className="flex-shrink-0 p-2.5 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
              <IconBook2 className="w-5 h-5 text-pink-500 dark:text-pink-400" strokeWidth={1.5} />
            </div>
            <div className="ml-4 flex-1">
              <div className="font-medium text-[13px] text-gray-900 dark:text-gray-100">Documentation</div>
              <div className="mt-1 text-gray-600 dark:text-gray-400 text-xs">
                Collection Notes and Usage Guides
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-2 items-center justify-center ml-4">
            {isEditing ? (
              <>
                <button
                  className="expand-docs-button"
                  onClick={onToggleExpand}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <>
                      <IconArrowsDiff size={16} strokeWidth={1.5} />
                      <span>Collapse</span>
                    </>
                  ) : (
                    <>
                      <IconArrowsHorizontal size={16} strokeWidth={1.5} />
                      <span>Expand</span>
                    </>
                  )}
                </button>
                <button
                  className="cancel-button"
                  onClick={handleDiscardChanges}
                  title="Cancel"
                >
                  <IconX size={18} strokeWidth={1.5} />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="save-button"
                  onClick={onSave}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  className="expand-docs-button"
                  onClick={onToggleExpand}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <>
                      <IconArrowsDiff size={16} strokeWidth={1.5} />
                      <span>Collapse</span>
                    </>
                  ) : (
                    <>
                      <IconArrowsHorizontal size={16} strokeWidth={1.5} />
                      <span>Expand</span>
                    </>
                  )}
                </button>
                <button className="edit-docs-button" onClick={toggleViewMode}>
                  <IconPencil size={16} strokeWidth={1.5} />
                  <span>Edit</span>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="docs-separator"></div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {isEditing ? (
            <CodeEditor
              collection={collection}
              theme={displayedTheme}
              value={docs}
              onEdit={onEdit}
              onSave={onSave}
              mode="application/text"
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
            />
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="min-h-[500px]">
                {
                  docs?.length > 0
                    ? <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
                    : <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={documentationPlaceholder} />
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Docs;


const documentationPlaceholder = `
Welcome to your collection documentation! This space is designed to help you document your API collection effectively.

## Overview
Use this section to provide a high-level overview of your collection. You can describe:
- The purpose of these API endpoints
- Key features and functionalities
- Target audience or users

## Best Practices
- Keep documentation up to date
- Include request/response examples
- Document error scenarios
- Add relevant links and references

## Markdown Support
This documentation supports Markdown formatting! You can use:
- **Bold** and *italic* text
- \`code blocks\` and syntax highlighting
- Tables and lists
- [Links](https://usebruno.com)
- And more!
`;
