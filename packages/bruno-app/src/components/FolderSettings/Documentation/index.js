import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import find from 'lodash/find';
import { updateFolderDocs } from 'providers/ReduxStore/slices/collections';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { useTranslation } from 'react-i18next';

const Documentation = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = focusedTab?.docsEditing || false;
  const docs = folder.draft ? get(folder, 'draft.docs', '') : get(folder, 'root.docs', '');

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `folder-docs-scroll-${folder.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.folder-settings-content', onChange: setScroll, enabled: !isEditing, initialValue: scroll });

  const toggleViewMode = () => {
    dispatch(updateDocsEditing({ uid: activeTabUid, docsEditing: !isEditing }));
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
        {isEditing ? t('FOLDER_SETTINGS.PREVIEW') : t('FOLDER_SETTINGS.EDIT')}
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
              initialScroll={scroll}
              onScroll={setScroll}
            />
          </div>
          <div className="mt-6 flex-shrink-0">
            <Button type="submit" size="sm" onClick={onSave}>
              {t('FOLDER_SETTINGS.SAVE')}
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
