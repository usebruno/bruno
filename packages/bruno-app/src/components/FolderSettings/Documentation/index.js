import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateFolderDocs } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { IconEdit } from '@tabler/icons';

const Documentation = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [isEditing, setIsEditing] = useState(false);
  const docs = folder.draft ? get(folder, 'draft.docs', '') : get(folder, 'root.docs', '');

  const toggleViewMode = () => {
    setIsEditing((prev) => !prev);
  };

  const onEdit = (value) => {
    dispatch(
      updateFolderDocs({
        folderUid: folder.uid,
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const onSave = () => {
    dispatch(saveFolderRoot(collection.uid, folder.uid));
    toggleViewMode();
  };

  const handleCancel = () => {
    toggleViewMode();
  };

  if (!folder) {
    return null;
  }

  return (
    <StyledWrapper className="mt-1 h-full w-full relative flex flex-col">
      <div className="flex flex-row gap-2 items-center">
        {isEditing ? (
          <>
            <button type="button" className="btn btn-sm btn-close" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="submit btn btn-sm btn-secondary" onClick={onSave}>
              Save
            </button>
          </>
        ) : (
          <div className="editing-mode" role="tab" onClick={toggleViewMode}>
            <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} />
          </div>
        )}
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
        </div>
      ) : (
        <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
      )}
    </StyledWrapper>
  );
};

export default Documentation;
