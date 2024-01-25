import { Editor, useMonaco } from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { debounce } from 'lodash';
import * as darkTheme from 'monaco-themes/themes/All Hallows Eve.json';
import { addMonacoCommands } from 'utils/monaco/monacoUtils';

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
    if (editor && monaco) {
      addMonacoCommands({ monaco, editor, onEdit, onSave, onRun });
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
        autoIndent: 'keep',
        formatOnType: true,
        formatOnPaste: true,
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
