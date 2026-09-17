import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from './CodeEditor/index';
import { saveFile } from 'providers/ReduxStore/slices/collections/actions';
import { IconDeviceFloppy } from '@tabler/icons';
import { toggleCollectionFileMode, updateFileContent } from 'providers/ReduxStore/slices/collections';
import { usePersistedState } from 'hooks/usePersistedState';

const FileEditor = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme, theme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [scroll, setScroll] = usePersistedState({ key: `file-mode-scroll-${item.uid}`, default: 0 });

  const content = item.draft ? item.draft.raw : item.raw || '';

  const onEdit = (value) => {
    dispatch(
      updateFileContent({
        content: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const hasChanges = item.draft != null;

  const onSave = () => {
    if (!hasChanges) return;
    dispatch(saveFile(content, item?.uid, collection?.uid));
  };

  const _toggleFileMode = () => {
    dispatch(toggleCollectionFileMode({ collectionUid: collection.uid }));
  };

  const editorMode = item?.type == 'js' ? 'javascript' : item?.type == 'json' ? 'javascript' : 'application/text';

  return (
    <div className="flex flex-grow relative h-full">
      <CodeEditor
        collection={collection}
        theme={displayedTheme}
        value={content}
        onEdit={onEdit}
        onSave={onSave}
        toggleFileMode={_toggleFileMode}
        mode={editorMode}
        font={get(preferences, 'font.codeFont', 'default')}
        initialScroll={scroll}
        onScroll={setScroll}
      />
      <IconDeviceFloppy
        onClick={onSave}
        color={hasChanges ? theme.draftColor : theme.requestTabs.icon.color}
        strokeWidth={1.5}
        size={22}
        className={`absolute right-0 top-0 m-4 ${
          hasChanges ? 'cursor-pointer opacity-100' : 'cursor-default opacity-50'
        }`}
      />
    </div>
  );
};

export default FileEditor;
