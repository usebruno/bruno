import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateFolderDocs } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { usePersistedContainerScroll } from 'hooks/usePersistedState/usePersistedContainerScroll';

const Documentation = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [isEditing, setIsEditing] = useState(false);
  const docs = folder.draft ? get(folder, 'draft.docs', '') : get(folder, 'root.docs', '');

  // Scroll persistence for both edit (CodeMirror) and preview (Markdown) modes using one shared key.
  // Preview mode: hook tracks .folder-settings-content scroll (enabled only when not editing).
  // Edit mode: CodeEditor's onScroll/initialScroll props write/read the same localStorage key.
  const wrapperRef = useRef(null);
  const storageKey = usePersistedContainerScroll(wrapperRef, '.folder-settings-content', `folder-docs-scroll-${folder.uid}`, !isEditing);

  const readScroll = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? JSON.parse(raw) || 0 : 0;
    } catch { return 0; }
  };

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
    <StyledWrapper className="w-full relative flex flex-col" ref={wrapperRef}>
      <div className="editing-mode flex justify-between items-center flex-shrink-0" role="tab" onClick={toggleViewMode}>
        {isEditing ? 'Preview' : 'Edit'}
      </div>

      {isEditing ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="mt-2 flex-1 overflow-auto min-h-0">
            <CodeEditor
              collection={collection}
              theme={displayedTheme}
              value={docs || ''}
              onEdit={onEdit}
              onSave={onSave}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              mode="application/text"
              initialScroll={readScroll()}
              onScroll={(editor) => localStorage.setItem(storageKey, JSON.stringify(editor.doc.scrollTop))}
            />
          </div>
          <div className="mt-6 flex-shrink-0">
            <Button type="submit" size="sm" onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-full">
          <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
        </div>
      )}
    </StyledWrapper>
  );
};

export default Documentation;
