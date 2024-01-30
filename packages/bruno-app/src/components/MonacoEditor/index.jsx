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
  withVariables,
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
  const [hoverProvider, setHoverProvider] = useState(null);
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
      setMonacoVariables(monaco, allVariables);
    }
  }, [allVariables]);
  /* useEffect(() => {
    console.log('triggering effect', monaco, collection, singleLine, allVariables);
    if (monaco && collection && (singleLine || mode === 'application/ld+json') && allVariables && Object.keys(allVariables ?? {}).length > 1) {
      setMonacoVariables(monaco, allVariables);
      hoverProvider?.dispose();
      setHoverProvider(monaco.languages.registerHoverProvider('typescript', {
        provideHover: (model, position) => {
          const word = getWordAtPosition(model, position);
          console.log('omg got a word', word)
          const variable = Object.entries(allVariables ?? {}).find(([key, value]) => key === word);
          if (variable) {
            return {
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              contents: [{ value: `**${variable[0]}**` }, { value: variable[1] }]
            };
          }
        }})
      );
    }
  }, []); */
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
        ...singleLineOptions
      }}
      height={singleLine ? '20px' : height}
      className="rounded-md h-full w-full flex bg-dark"
      theme={finalTheme === 'dark' ? 'bruno-dark' : 'bruno-light'}
      language={withVariables ? 'typescript' : languages[mode]}
      value={cachedValue}
      onMount={onMount}
      onChange={!readOnly ? handleEditorChange : () => {}}
    />
  );
};
