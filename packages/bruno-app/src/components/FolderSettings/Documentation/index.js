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
import { IconDeviceFloppy } from '@tabler/icons';

const Documentation = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [isEditing, setIsEditing] = useState(false);
  const docs = get(folder, 'root.docs', '');
  const { theme } = useTheme();


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

  const onSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  if (!folder) {
    return null;
  }

  return (
    <StyledWrapper className="flex flex-col gap-y-1 h-full w-full relative">
      <div className="editing-mode mb-2 flex justify-between items-center" role="tab" onClick={toggleViewMode}>
        {isEditing ? 'Preview' : 'Edit'}
        {isEditing ? (
          <button onClick={onSave}>
            <IconDeviceFloppy
              className="absolute right-0 top-6 m-4 z-10"
              strokeWidth={1.5}
              size={22}
              color={theme.colors.text.yellow}            
            />
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <CodeEditor
          collection={collection}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={docs || ''}
          onEdit={onEdit}
          onSave={onSave}
          mode="application/text"
        />
      ) : (
        <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
      )}
    </StyledWrapper>
  );
};

export default Documentation;
