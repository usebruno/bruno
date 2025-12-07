import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from './CodeEditor/index';
import { IconDeviceFloppy } from '@tabler/icons';
import { saveApiSpecToFile } from 'providers/ReduxStore/slices/apiSpec';
import { useState } from 'react';

const FileEditor = ({ apiSpec }) => {
  const dispatch = useDispatch();
  const { displayedTheme, theme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const [content, setContent] = useState(apiSpec?.raw);

  const onEdit = (value) => {
    setContent(value);
  };

  const onSave = () => {
    dispatch(saveApiSpecToFile({ uid: apiSpec?.uid, content }));
  };

  const hasChanges = Boolean(content != apiSpec?.raw);

  const editorMode = 'yaml';

  return (
    <div className="flex flex-grow relative">
      <CodeEditor
        theme={displayedTheme}
        value={content}
        onEdit={onEdit}
        onSave={onSave}
        mode={editorMode}
        font={get(preferences, 'font.codeFont', 'default')}
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
