import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from './CodeEditor/index';
import { saveFile } from 'providers/ReduxStore/slices/collections/actions';
import { IconDeviceFloppy } from '@tabler/icons';
import { updateFileContent } from "providers/ReduxStore/slices/collections";
import { toggleCollectionFileMode } from 'providers/ReduxStore/slices/collections/index';

const FileEditor = ({ item, collection, type }) => {
  const dispatch = useDispatch();
  const { displayedTheme, theme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const content = item?.draft ? item?.draft?.raw : item?.raw || "";

  const onEdit = (value) => {
    dispatch(
      updateFileContent({
        content: value,
        itemUid: item?.uid,
        collectionUid: collection.uid,
        type
      })
    );
  };

  const onSave = () => {
    dispatch(saveFile(content, item?.pathname));
  };

  const _toggleFileMode = () => {
    dispatch(
      toggleCollectionFileMode({
        collectionUid: collection.uid
      })
    );
  };

  const hasChanges = item?.draft !== null;

  const editorMode = item?.type == 'js' ? 'javascript' : item?.type == 'json' ? 'javascript' : 'application/text';

  return (
    <div className="flex flex-grow relative">
      <CodeEditor
        collection={collection}
        theme={displayedTheme}
        value={content}
        onEdit={onEdit}
        onSave={onSave}
        toggleFileMode={_toggleFileMode}
        mode={editorMode}
        font={get(preferences, 'font.codeFont', 'default')}
        type={type}
      />
      <IconDeviceFloppy
        onClick={onSave}
        color={hasChanges ? theme.colors.text.yellow : theme.requestTabs.icon.color}
        strokeWidth={1.5}
        size={22}
        className={`absolute right-0 top-0 m-4 ${
          hasChanges ? 'cursor-pointer oapcity-100' : 'cursor-default opacity-50'
        }`}
      />
    </div>
  );
};

export default FileEditor;
