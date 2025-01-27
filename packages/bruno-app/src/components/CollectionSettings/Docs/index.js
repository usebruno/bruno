import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateCollectionDocs } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { IconEdit, IconTrash, IconFileText } from '@tabler/icons';

const Docs = ({ collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const docs = get(collection, 'root.docs', '');
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
    dispatch(
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: docs
      })
    );
    toggleViewMode();
  }

  const onSave = () => {
    dispatch(saveCollectionRoot(collection.uid));
  }

  return (
    <StyledWrapper className="mt-1 h-full w-full relative flex flex-col">
      <div className='flex flex-row w-full justify-between items-center mb-4'>
        <div className='text-lg font-medium flex items-center gap-2'>
          <IconFileText size={20} strokeWidth={1.5} />
          Documentation
        </div>
        <div className='flex flex-row gap-2 items-center justify-center'>
          <div className="editing-mode" role="tab" onClick={handleDiscardChanges}>
            {isEditing ? <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5} /> : <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} />}
          </div>
          {/* <div className="editing-mode" role="tab" onClick={toggleViewMode}>
            <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} />
          </div> */}
          {/* <button type="submit" className="submit btn btn-sm btn-secondary" onClick={onSave}>
            Save
          </button> */}
        </div>
      </div>
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
        <div className='h-full overflow-auto'>
          <div className='h-[1px] min-h-[500px]'>
            {
              docs?.length > 0 ?
                <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
                :
                <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={documentationPlaceholder} />
            }         
          </div>
        </div>
      )}
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
- [Links](https://example.com)
- And more!
`;
