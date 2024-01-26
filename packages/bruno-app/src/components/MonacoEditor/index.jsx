import { Editor, useMonaco } from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { debounce } from 'lodash';
import * as darkTheme from 'monaco-themes/themes/All Hallows Eve.json';
import { addMonacoCommands } from 'utils/monaco/monacoUtils';
import { getAllVariables } from 'utils/collections';

export const MonacoEditor = ({
  collection,
  font,
  mode = 'plaintext',
  onChange,
  onRun,
  onSave,
  readOnly,
  theme,
  value,
  singleLine,
  height = '60vh'
}) => {
  const monaco = useMonaco();
  // monaco.editor.defineTheme('darkTheme', darkTheme);
  const languages = {
    text: 'text',
    plaintext: 'plaintext',
    graphql: 'graphql',
    sparql: 'graphql',
    'graphql-query': 'graphql',
    'application/sparql-query': 'sparql',
    'application/ld+json': 'json',
    'application/text': 'text',
    'application/xml': 'xml',
    'application/javascript': 'typescript',
    javascript: 'typescript'
  };
  const [cachedValue, setCachedValue] = useState(value ?? '');
  const debounceChanges = debounce((newValue) => {
    onChange(newValue);
  }, 300);
  const handleEditorChange = (value, event) => {
    debounceChanges(value);
  };
  const onMount = (editor) => {
    if (editor && monaco) {
      addMonacoCommands({ monaco, editor, onChange, onSave, onRun });
    }
  };
  const allVariables = getAllVariables(collection);
  console.log('those are the variables', allVariables);
  const singleLineOptions = singleLine
    ? {
        folding: false,
        renderLineHighlight: 'none',
        lineNumbers: 'off',
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        glyphMargin: false
      }
    : {};

  return (
    <Editor
      options={{
        fontSize: font,
        readOnly: readOnly,
        minimap: { enabled: !singleLine },
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
        },
        ...singleLineOptions
      }}
      height={singleLine ? '20px' : height}
      className="rounded-md h-full w-full flex"
      theme={theme === 'dark' ? 'vs-dark' : 'light'}
      language={languages[mode]}
      value={cachedValue}
      onMount={onMount}
      onChange={!readOnly ? handleEditorChange : () => {}}
    />
  );
};
