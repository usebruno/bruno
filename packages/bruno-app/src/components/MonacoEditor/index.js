import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useDispatch } from 'react-redux';
import 'utils/monaco/workers';
import * as monaco from 'monaco-editor';
import { mapCodeMirrorModeToMonaco } from 'utils/monaco/languageMapping';
import { registerBrunoTheme, getCurrentThemeName } from 'utils/monaco/brunoTheme';
import { registerBrunoApiTypes } from 'utils/monaco/brunoApiTypes';
import { setupVariableHighlighting, setupVariableTooltip } from 'utils/monaco/variableHighlighting';
import { setupAutoComplete } from 'utils/monaco/autocomplete';
import { useTheme as useStyledTheme } from 'styled-components';
import StyledWrapper from './StyledWrapper';

const TAB_SIZE = 2;

const MonacoEditor = forwardRef(({
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
  enableVariableHighlighting = false,
  onScroll,
  initialScroll = 0,
  collection,
  item
}, ref) => {
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
  const tooltipCleanupRef = useRef(null);
  const autocompleteCleanupRef = useRef(null);

  const styledTheme = useStyledTheme();
  const dispatch = useDispatch();

  // Expose a ref-compatible interface matching CodeEditor's class instance shape.
  // Consumers call ref.current.editor.refresh() — Monaco's automaticLayout handles this,
  // so layout() is called as a safe equivalent.
  useImperativeHandle(ref, () => ({
    editor: {
      refresh: () => {
        editorRef.current?.layout();
      }
    }
  }));

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

    // Register Bruno API types (idempotent, only runs once)
    registerBrunoApiTypes();

    const editor = monaco.editor.create(containerRef.current, {
      value: value || '',
      language,
      // Use a stable base theme for creation; the theme-sync effect registers
      // and applies the full Bruno theme before the browser paints.
      theme: getCurrentThemeName(theme),
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
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true
      },
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

    // Setup variable highlighting and tooltip — gated by enableVariableHighlighting
    if (collectionRef.current && enableVariableHighlighting) {
      variableCleanupRef.current = setupVariableHighlighting(editor, collectionRef.current, itemRef.current);
      tooltipCleanupRef.current = setupVariableTooltip(
        editor,
        () => collectionRef.current,
        () => itemRef.current,
        dispatch
      );
    }

    // Setup variable autocomplete ({{variable}} suggestions)
    // API hints (req, res, bru) are handled by Monaco's built-in IntelliSense via brunoApiTypes
    if (collectionRef.current) {
      autocompleteCleanupRef.current = setupAutoComplete(
        editor,
        () => collectionRef.current,
        () => itemRef.current
      );
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
      // Clean up variable highlighting, tooltip, and autocomplete
      variableCleanupRef.current?.();
      tooltipCleanupRef.current?.();
      autocompleteCleanupRef.current?.();
      contentDisposable.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // Only run on mount/unmount
  }, []);

  // Re-apply variable highlighting and tooltip when collection/item/flag changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !collection) return;

    if (enableVariableHighlighting) {
      // Clean up and re-setup highlighting with updated variables
      variableCleanupRef.current?.();
      variableCleanupRef.current = setupVariableHighlighting(editor, collection, item);

      // Setup tooltip if not already active
      if (!tooltipCleanupRef.current) {
        tooltipCleanupRef.current = setupVariableTooltip(
          editor,
          () => collectionRef.current,
          () => itemRef.current,
          dispatch
        );
      }
    } else {
      // Tear down when disabled
      variableCleanupRef.current?.();
      variableCleanupRef.current = null;
      tooltipCleanupRef.current?.();
      tooltipCleanupRef.current = null;
    }
  }, [collection, item, enableVariableHighlighting]);

  // Sync external value changes without resetting scroll, selections, or undo history
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value !== cachedValueRef.current) {
      cachedValueRef.current = value;
      const model = editor.getModel();
      if (!model) return;

      const selections = editor.getSelections();
      const scrollTop = editor.getScrollTop();
      const fullRange = model.getFullModelRange();

      model.pushEditOperations(
        selections,
        [{ range: fullRange, text: value || '' }],
        () => selections
      );

      editor.setScrollTop(scrollTop);
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
    >
      <div
        ref={containerRef}
        className="monaco-editor-container"
        data-testid="monaco-editor-container"
        style={{ height: '100%', width: '100%' }}
      />
    </StyledWrapper>
  );
});

export default MonacoEditor;
