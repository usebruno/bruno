import React, { useState, useEffect, Suspense } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import { IconDeviceFloppy } from '@tabler/icons';
import CodeEditor from './FileEditor/CodeEditor/index';
import Swagger from './Renderers/Swagger';

/**
 * Shared split-pane spec viewer: CodeEditor (left) + Swagger preview (right).
 *
 * Props:
 *  - content    (string)   The spec content (YAML/JSON string)
 *  - readOnly   (boolean)  If true, editor is not editable and save icon is hidden
 *  - onSave     (function) Called with current editor content on save (editable mode only)
 */
const SpecViewer = ({ content, readOnly, onSave }) => {
  const { displayedTheme, theme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const [editorContent, setEditorContent] = useState(content);

  // Sync editor when saved content changes from outside (e.g. after save completes)
  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const hasChanges = !readOnly && editorContent !== content;

  const handleSave = () => {
    if (onSave) onSave(editorContent);
  };

  return (
    <section className="main flex flex-grow pl-4 relative">
      <div className="w-full grid grid-cols-2">
        <div className="col-span-1">
          <div className="flex flex-grow relative">
            <CodeEditor
              theme={displayedTheme}
              value={readOnly ? content : editorContent}
              readOnly={readOnly ? 'nocursor' : false}
              onEdit={readOnly ? undefined : (val) => setEditorContent(val)}
              onSave={readOnly ? undefined : handleSave}
              mode="yaml"
              font={get(preferences, 'font.codeFont', 'default')}
            />
            {!readOnly && onSave && (
              <IconDeviceFloppy
                onClick={handleSave}
                color={hasChanges ? theme.draftColor : theme.requestTabs.icon.color}
                strokeWidth={1.5}
                size={22}
                className={`absolute right-0 top-0 m-4 ${
                  hasChanges ? 'cursor-pointer opacity-100' : 'cursor-default opacity-50'
                }`}
              />
            )}
          </div>
        </div>
        <div className="col-span-1">
          <Suspense fallback="">
            <Swagger string={content} />
          </Suspense>
        </div>
      </div>
    </section>
  );
};

export default SpecViewer;
