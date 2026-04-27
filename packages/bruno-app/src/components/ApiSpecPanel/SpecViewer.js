import React, { useState, useEffect, useRef, useCallback } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import { IconDeviceFloppy, IconLoader2 } from '@tabler/icons';
import CodeEditor from './FileEditor/CodeEditor/index';
import Swagger from './Renderers/Swagger';
import { useDragResize } from 'hooks/useDragResize';

const MIN_LEFT_PANE_WIDTH = 300;
const MIN_RIGHT_PANE_WIDTH = 450;

/**
 * Shared split-pane spec viewer: CodeEditor (left) + Swagger preview (right).
 *
 * Props:
 *  - content               (string)  The spec content (YAML/JSON string)
 *  - readOnly              (boolean) If true, editor is not editable and save icon is hidden
 *  - onSave                (fn)      Called with current editor content on save (editable mode only)
 *  - leftPaneWidth         (number|null) Persisted left pane width in px; null = use 50/50 default
 *  - onLeftPaneWidthChange (fn)      Persist the new width (called on mouseup / double-click / resize-clamp)
 */
const SpecViewer = ({ content, readOnly, onSave, leftPaneWidth, onLeftPaneWidthChange }) => {
  const { displayedTheme, theme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const [editorContent, setEditorContent] = useState(content);

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const hasChanges = !readOnly && editorContent !== content;

  const handleSave = () => {
    if (onSave) onSave(editorContent);
  };

  const mainSectionRef = useRef(null);
  const { dragging, dragWidth, dragbarProps } = useDragResize({
    containerRef: mainSectionRef,
    width: leftPaneWidth,
    onWidthChange: onLeftPaneWidthChange,
    minLeft: MIN_LEFT_PANE_WIDTH,
    minRight: MIN_RIGHT_PANE_WIDTH
  });

  const effectiveWidth = dragging ? dragWidth : leftPaneWidth;
  const leftPaneStyle = effectiveWidth != null
    ? { width: `${effectiveWidth}px`, flexShrink: 0 }
    : { flex: '1 1 50%', minWidth: 0 };

  const [swaggerReady, setSwaggerReady] = useState(false);
  useEffect(() => {
    setSwaggerReady(false);
  }, [content]);
  const handleSwaggerComplete = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSwaggerReady(true));
    });
  }, []);

  return (
    <section
      ref={mainSectionRef}
      className={`main flex flex-grow pl-4 relative ${dragging ? 'dragging' : ''}`}
    >
      <div
        className="api-spec-left-pane flex flex-grow relative h-full"
        style={leftPaneStyle}
      >
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
      <div className="dragbar-wrapper" {...dragbarProps}>
        <div className="dragbar-handle" />
      </div>
      <div
        className="api-spec-right-pane relative"
        style={{ flex: '1 1 50%', minWidth: 0 }}
      >
        <div style={{ visibility: swaggerReady ? 'visible' : 'hidden', height: '100%' }}>
          <Swagger spec={content} onComplete={handleSwaggerComplete} />
        </div>
        {!swaggerReady && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-2"
            style={{ background: theme.bg }}
          >
            <div className="flex items-center justify-center gap-2 opacity-70">
              <IconLoader2 size={20} className="animate-spin" />
              <span>Generating preview…</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default SpecViewer;
