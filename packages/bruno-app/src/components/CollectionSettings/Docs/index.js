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
import { IconEdit, IconTrash } from '@tabler/icons';

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
      <div className='text-lg font-medium'>
        {collection?.name}
      </div>
      <div className='flex flex-row w-full justify-between items-center mb-4'>
        <div>
          Documentation
        </div>
        <div className='flex flex-row gap-2 items-center justify-center'>
          <div className="editing-mode" role="tab" onClick={handleDiscardChanges}>
            {isEditing ? <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5} /> : <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} />}
          </div>
          {/* <div className="editing-mode" role="tab" onClick={toggleViewMode}>
            <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} />
          </div> */}
          <button type="submit" className="submit btn btn-sm btn-secondary" onClick={onSave}>
            Save
          </button>
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
# Add you collection documentation here.

## Why Documentation Matters

Clear, comprehensive documentation is key to helping others understand, use, and contribute to the project. It makes the codebase accessible to everyone and ensures that new contributors can get up to speed quickly.

## Documentation Guidelines

- Keep it simple and clear.
- Use examples where possible.
- Maintain a friendly and inclusive tone.

`;
