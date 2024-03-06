import { Editor, useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';
import { debounce } from 'lodash';
import { addMonacoCommands, addMonacoSingleLineActions, setMonacoVariables } from 'utils/monaco/monacoUtils';
import { getAllVariables } from 'utils/collections';
import { useTheme } from 'providers/Theme';

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

export const MonacoEditor = ({
  collection,
  font,
  mode = 'plaintext',
  onChange,
  onRun,
  onSave,
  readOnly,
  value,
  singleLine,
  withVariables = false,
  height = '60vh'
}) => {
  const monaco = useMonaco();
  const { displayedTheme } = useTheme();

  const debounceChanges = debounce((newValue) => {
    onChange(newValue);
  }, 300);
  const handleEditorChange = (value, event) => {
    debounceChanges(value);
  };

  const onMount = (editor, monaco) => {
    addMonacoCommands({ monaco, editor, onChange, onSave, onRun });
    if (singleLine) {
      addMonacoSingleLineActions(editor);
    }
  };

  const allVariables = getAllVariables(collection);
  useEffect(() => {
    if (allVariables && withVariables) {
      setMonacoVariables(monaco, allVariables, languages[mode] ?? 'plaintext');
    }
  }, [allVariables, withVariables, mode]);

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
        showFoldingControls: 'never',
        selectionHighlight: false,
        occurrencesHighlight: 'off',
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
      height={singleLine ? '22px' : height}
      className={!singleLine ? 'rounded-md border border-zinc-200 dark:border-zinc-700' : undefined}
      theme={displayedTheme === 'dark' ? 'bruno-dark' : 'bruno-light'}
      language={languages[mode] ?? 'plaintext'}
      value={value}
      onMount={onMount}
      onChange={!readOnly ? handleEditorChange : () => {}}
    />
  );
};

export default MonacoEditor;
