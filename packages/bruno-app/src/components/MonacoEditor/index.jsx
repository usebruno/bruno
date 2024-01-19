import { Editor, useMonaco } from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { debounce } from 'lodash';
import * as darkTheme from 'monaco-themes/themes/All Hallows Eve.json';

export const MonacoEditor = ({
  collection,
  font,
  mode,
  onEdit,
  onRun,
  onSave,
  readOnly,
  theme,
  value,
  height = '60vh'
}) => {
  const monaco = useMonaco();
  // monaco.editor.defineTheme('darkTheme', darkTheme);
  const languages = {
    'application/sparql-query': 'sparql',
    'application/ld+json': 'json',
    'application/text': 'text',
    'application/xml': 'xml',
    'application/javascript': 'typescript',
    javascript: 'typescript'
  };
  const [cachedValue, setCachedValue] = useState(value ?? '');
  const debounceChanges = debounce((newValue) => {
    onEdit(newValue);
  }, 300);
  const handleEditorChange = (value, event) => {
    debounceChanges(value);
  };
  const onMount = (editor) => {
    // TODO : move all of this in a separate file
    if (editor) {
      console.log('here is the monaco instance:', editor, monaco);
      // editor.updateOptions()
      editor.addAction({
        id: 'save',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        label: 'Save',
        run: () => {
          onEdit(editor.getValue());
          onSave();
        }
      });
      editor.addAction({
        id: 'run',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        label: 'Run',
        run: () => {
          onRun();
        }
      });
      editor.addAction({
        id: 'foldAll',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY],
        label: 'FoldAll',
        run: () => {
          editor.trigger('fold', 'editor.foldAll');
        }
      });
      editor.addAction({
        id: 'unfoldAll',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
        label: 'UnfoldAll',
        run: () => {
          editor.trigger('fold', 'editor.unfoldAll');
        }
      });
    }
  };
  return (
    <Editor
      options={{
        fontSize: font,
        readOnly: readOnly,
        minimap: { enabled: false },
        wordWrap: 'off',
        wrappingIndent: 'indent',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'hidden'
        }
      }}
      height={height}
      className="rounded-md h-full w-full flex"
      theme={theme === 'dark' ? 'vs-dark' : 'light'}
      defaultLanguage="typescript"
      language={languages[mode]}
      value={cachedValue}
      onMount={onMount}
      onChange={handleEditorChange}
    />
  );
};
