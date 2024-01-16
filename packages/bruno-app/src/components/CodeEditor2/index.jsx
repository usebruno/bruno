import React, { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { defaultKeymap } from '@codemirror/commands';
import { foldAll, unfoldAll } from '@codemirror/language';
import { StyledWrapper } from 'components/CodeEditor2/StyledWrapper';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { autocompletion } from '@codemirror/autocomplete';
import { debounce } from 'lodash';
import {
  materialDark,
  githubLight,
  monokai,
  noctisLilac,
  eclipse,
  aura,
  copilot,
  okaidia,
  sublime,
  xcodeDark,
  vscodeDark
} from '@uiw/codemirror-themes-all';
import styled from 'styled-components';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';

const hintWords = [
  { label: 'res' },
  { label: 'res.status' },
  { label: 'res.statusText' },
  { label: 'res.headers' },
  { label: 'res.body' },
  { label: 'res.responseTime' },
  { label: 'res.getStatus()' },
  { label: 'res.getHeader(name)' },
  { label: 'res.getHeaders()' },
  { label: 'res.getBody()' },
  { label: 'res.getResponseTime()' },
  { label: 'req' },
  { label: 'req.url' },
  { label: 'req.method' },
  { label: 'req.headers' },
  { label: 'req.body' },
  { label: 'req.timeout' },
  { label: 'req.getUrl()' },
  { label: 'req.setUrl(url)' },
  { label: 'req.getMethod()' },
  { label: 'req.setMethod(method)' },
  { label: 'req.getHeader(name)' },
  { label: 'req.getHeaders()' },
  { label: 'req.setHeader(name, value)' },
  { label: 'req.setHeaders(data)' },
  { label: 'req.getBody()' },
  { label: 'req.setBody(data)' },
  { label: 'req.setMaxRedirects(maxRedirects)' },
  { label: 'req.getTimeout()' },
  { label: 'req.setTimeout(timeout)' },
  { label: 'bru' },
  { label: 'bru.cwd()' },
  { label: 'bru.getEnvName(key)' },
  { label: 'bru.getProcessEnv(key)' },
  { label: 'bru.getEnvVar(key)' },
  { label: 'bru.setEnvVar(key,value)' },
  { label: 'bru.getVar(key)' },
  { label: 'bru.setVar(key,value)' }
];

const hint = (context) => {
  let word = context.matchBefore(/\w+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: hintWords
  };
};

const languages = {
  'application/sparql-query': 'sparql',
  'application/ld+json': 'json',
  'application/text': 'text',
  'application/xml': 'xml',
  'application/javascript': 'javascript',
  javascript: 'javascript'
};

const CodeEditor2 = ({ collection, font, mode, onEdit, onRun, onSave, readOnly, theme, value }) => {
  window.jsonlint = jsonlint;
  window.JSHINT = JSHINT;
  const [editor, setEditor] = useState(null);

  const debounceChanges = debounce((newValue) => {
    onEdit(newValue);
  }, 700);

  const controlledEdit = useCallback(
    (newValue) => {
      if (value !== newValue && editor) {
        debounceChanges(newValue);
      }
    },
    [debounceChanges, editor, value]
  );

  const extensions = [
    loadLanguage(languages[mode]),
    autocompletion({ override: [hint] }),
    keymap.of([
      { key: 'Mod-s', run: onSave },
      { key: 'Ctrl-s', run: onSave },
      { key: 'Mod-Enter', run: onRun },
      { key: 'Ctrl-Enter', run: onRun },
      { key: 'Ctrl-Space', run: autocompletion.autocomplete },
      { key: 'Ctrl-y', run: foldAll },
      { key: 'Mod-y', run: foldAll },
      { key: 'Ctrl-i', run: unfoldAll },
      { key: 'Mod-i', run: unfoldAll },
      ...defaultKeymap
    ])
  ];
  return (
    <StyledWrapper className="h-full">
      <CodeMirror
        className="rounded-md h-full"
        basicSetup={{
          autocompletion: true,
          tabSize: 2,
          closeBrackets: true,
          defaultKeymap: false
        }}
        onCreateEditor={(editor) => setEditor(editor)}
        readOnly={readOnly}
        theme={theme === 'dark' ? vscodeDark : eclipse}
        value={value}
        height="100%"
        onChange={controlledEdit}
        extensions={extensions}
      />
    </StyledWrapper>
  );
};

export default CodeEditor2;
