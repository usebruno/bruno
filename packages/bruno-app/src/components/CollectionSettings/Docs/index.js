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

const Docs = ({ collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const docs = collection.draft ? get(collection, 'draft.docs', '') : get(collection, 'root.docs', '');
  const preferences = useSelector((state) => state.app.preferences);
  const { theme, storedTheme } = useTheme();

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

  const onSave = () => dispatch(saveCollectionRoot(collection.uid));

  return (
    <StyledWrapper className="mt-1 h-full w-full relative flex flex-col">
      <div className="editing-mode flex justify-between items-center" role="tab" onClick={toggleViewMode}>
        {isEditing ? 'Preview' : 'Edit'}
      </div>

      {isEditing ? (
        <div className="mt-2 flex-1 max-h-[70vh]">
          <CodeEditor
            collection={collection}
            theme={displayedTheme}
            value={docs || ''}
            onEdit={onEdit}
            onSave={onSave}
            mode="application/text"
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
          />
          <button type="submit" className="submit btn btn-sm btn-secondary my-6" onClick={onSave}>
            Save
          </button>
        </div>
      ) : (
        <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
      )}
    </StyledWrapper>
  );
};

export default Docs;
