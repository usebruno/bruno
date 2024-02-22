import { Editor, useMonaco } from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { debounce } from 'lodash';
import { addMonacoCommands, getWordAtPosition, setMonacoVariables } from 'utils/monaco/monacoUtils';
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
                               withVariables = false,
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
  const finalTheme =
    theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
  // const finalTheme = theme ?? storedTheme;
  const onMount = (editor) => {
    if (editor && monaco) {
      addMonacoCommands({ monaco, editor, onChange, onSave, onRun });
      if (singleLine) {
        editor.onKeyDown((e) => {
          if (e.keyCode == monaco.KeyCode.Enter) {
            // We only prevent enter when the suggest model is not active
            if (editor.getContribution('editor.contrib.suggestController').model.state == 0) {
              e.preventDefault();
            }
          }
        });
        editor.onDidPaste((e) => {
          if (e.range.endLineNumber > 1) {
            let newContent = '';
            let lineCount = cachedValue.getLineCount();
            for (let i = 0; i < lineCount; i++) {
              newContent += cachedValue.getLineContent(i + 1);
            }
            cachedValue.setValue(newContent);
          }
        });
      }
    }
  };
  const allVariables = getAllVariables(collection);
  useEffect(() => {
    if (allVariables && withVariables) {
      setMonacoVariables(monaco, allVariables, "javascript");
    }
  }, [allVariables, withVariables]);
  const singleLineOptions = singleLine
    ? {
      folding: false,
      renderLineHighlight: 'none',
      lineNumbers: 'off',
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      glyphMargin: false,
      links: false,
      wordWrap: 'off',
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      scrollBeyondLastColumn: 0,
      scrollbar: { horizontal: 'hidden', vertical: 'hidden' },
      find: { addExtraSpaceOnTop: false, autoFindInSelection: 'never', seedSearchStringFromSelection: false },
      minimap: { enabled: false }
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
        renderLineHighlight: 'none',
        ...singleLineOptions
      }}
      height={singleLine ? '20px' : height}
      className="rounded-md h-full w-full flex border border-zinc-200 dark:border-zinc-700"
      theme={finalTheme === 'dark' ? 'bruno-dark' : 'bruno-light'}
      language={withVariables ? 'javascript' : languages[mode]}
      value={cachedValue}
      onMount={onMount}
      onChange={!readOnly ? handleEditorChange : () => {}}
    />
  );
};

export default MonacoEditor;