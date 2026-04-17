import React, { useRef, useEffect } from 'react';
import 'utils/monaco/workers';
import * as monaco from 'monaco-editor';
import { mapCodeMirrorModeToMonaco } from 'utils/monaco/languageMapping';
import { registerBrunoTheme } from 'utils/monaco/brunoTheme';
import { registerBrunoApiTypes } from 'utils/monaco/brunoApiTypes';
import { setupVariableHighlighting, registerVariableHoverProvider } from 'utils/monaco/variableHighlighting';
import { useTheme as useStyledTheme } from 'styled-components';
import StyledWrapper from './StyledWrapper';

const TAB_SIZE = 2;

const MonacoEditor = ({
  value = '',
  mode,
  theme,
  onEdit,
  onRun,
  onSave,
  readOnly = false,
  font,
  fontSize,
  enableLineWrapping = true,
  onScroll,
  initialScroll = 0,
  collection,
  item
}) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const cachedValueRef = useRef(value);
  const onEditRef = useRef(onEdit);
  const onRunRef = useRef(onRun);
  const onSaveRef = useRef(onSave);
  const onScrollRef = useRef(onScroll);
  const collectionRef = useRef(collection);
  const itemRef = useRef(item);
  const variableCleanupRef = useRef(null);
  const hoverProviderRef = useRef(null);

  const styledTheme = useStyledTheme();

  // Keep callback refs up to date
  useEffect(() => { onEditRef.current = onEdit; }, [onEdit]);
  useEffect(() => { onRunRef.current = onRun; }, [onRun]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onScrollRef.current = onScroll; }, [onScroll]);
  useEffect(() => { collectionRef.current = collection; }, [collection]);
  useEffect(() => { itemRef.current = item; }, [item]);

  const language = mapCodeMirrorModeToMonaco(mode);

  // Create editor on mount, dispose on unmount
  useEffect(() => {
    if (!containerRef.current) return;

    // Register Bruno API types for intellisense (idempotent, only runs once)
    registerBrunoApiTypes();

    // Register Bruno theme from the styled-components theme
    const themeName = registerBrunoTheme(styledTheme, theme);

    const editor = monaco.editor.create(containerRef.current, {
      value: value || '',
      language,
      theme: themeName,
      readOnly,
      tabSize: TAB_SIZE,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: enableLineWrapping ? 'on' : 'off',
      fontFamily: font && font !== 'default' ? font : undefined,
      fontSize: fontSize || 13,
      lineNumbers: 'on',
      lineNumbersMinChars: 1,
      lineDecorationsWidth: 0,
      glyphMargin: false,
      renderLineHighlight: 'line',
      matchBrackets: 'always',
      autoClosingBrackets: 'always',
      folding: true,
      fixedOverflowWidgets: true,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8
      }
    });

    editorRef.current = editor;

    // Listen for content changes
    const contentDisposable = editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      cachedValueRef.current = newValue;
      if (onEditRef.current) {
        onEditRef.current(newValue);
      }
    });

    // Keybinding: Cmd/Ctrl+Enter → onRun
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRunRef.current) onRunRef.current();
    });

    // Keybinding: Cmd/Ctrl+S → onSave
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSaveRef.current) onSaveRef.current();
    });

    // Add mousetrap class for global shortcut passthrough
    const textarea = editor.getDomNode()?.querySelector('textarea');
    if (textarea) {
      textarea.classList.add('mousetrap');
    }

    // Setup variable highlighting
    if (collectionRef.current) {
      variableCleanupRef.current = setupVariableHighlighting(editor, collectionRef.current, itemRef.current);
      hoverProviderRef.current = registerVariableHoverProvider(collectionRef.current, itemRef.current);
    }

    // Apply initial scroll position
    if (initialScroll > 0) {
      editor.setScrollTop(initialScroll);
    }

    return () => {
      // Save scroll position before disposing
      if (onScrollRef.current && editor) {
        onScrollRef.current({
          doc: { scrollTop: editor.getScrollTop() }
        });
      }
      // Clean up variable highlighting
      variableCleanupRef.current?.();
      hoverProviderRef.current?.dispose();
      contentDisposable.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // Only run on mount/unmount
  }, []);

  // Re-apply variable highlighting when collection/item changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !collection) return;

    // Clean up old highlighting
    variableCleanupRef.current?.();
    hoverProviderRef.current?.dispose();

    // Setup new highlighting with updated variables
    variableCleanupRef.current = setupVariableHighlighting(editor, collection, item);
    hoverProviderRef.current = registerVariableHoverProvider(collection, item);
  }, [collection, item]);

  // Sync external value changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value !== cachedValueRef.current) {
      cachedValueRef.current = value;
      const position = editor.getPosition();
      editor.setValue(value || '');
      if (position) {
        editor.setPosition(position);
      }
    }
  }, [value]);

  // Sync theme — re-register Bruno theme when it changes
  useEffect(() => {
    const themeName = registerBrunoTheme(styledTheme, theme);
    monaco.editor.setTheme(themeName);
  }, [theme, styledTheme]);

  // Sync language
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }, [language]);

  // Sync readOnly
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.updateOptions({ readOnly });
    }
  }, [readOnly]);

  // Sync word wrap
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.updateOptions({ wordWrap: enableLineWrapping ? 'on' : 'off' });
    }
  }, [enableLineWrapping]);

  // Sync font settings
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.updateOptions({
        fontFamily: font && font !== 'default' ? font : undefined,
        fontSize: fontSize || 13
      });
    }
  }, [font, fontSize]);

  return (
    <StyledWrapper
      className="h-full w-full flex flex-col"
      aria-label="Monaco Editor"
      font={font}
      fontSize={fontSize}
    >
      <div
        ref={containerRef}
        className="monaco-editor-container"
        style={{ height: '100%', width: '100%' }}
      />
    </StyledWrapper>
  );
};

export default MonacoEditor;
