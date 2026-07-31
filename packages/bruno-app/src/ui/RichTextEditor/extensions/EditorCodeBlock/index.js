import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import MenuDropdown from 'ui/MenuDropdown';
import { IconChevronDown, IconCopy, IconCheck } from '@tabler/icons';
import { lowlight } from 'lowlight';
import protobuf from 'highlight.js/lib/languages/protobuf';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import { EDITOR_MENU_DROPDOWN_PROPS } from '../../utils/editorToolbarUi';

lowlight.registerLanguage('protobuf', protobuf);

const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
  'bash',
  'sql',
  'yaml',
  'xml',
  'css',
  'json',
  'markdown',
  'kotlin',
  'swift',
  'protobuf'
];

const EditorCodeBlock = ({ node, updateAttributes, extension }) => {
  const language = node.attrs.language || 'auto';
  const preRef = useRef(null);
  const pasteTimeoutRef = useRef(null);
  const { copied, copyToClipboard } = useCopyToClipboard();

  useEffect(() => {
    return () => {
      if (pasteTimeoutRef.current) clearTimeout(pasteTimeoutRef.current);
    };
  }, []);

  const handlePaste = useCallback(() => {
    pasteTimeoutRef.current = setTimeout(() => {
      if (preRef.current) {
        const text = preRef.current.textContent;
        if (!text) return;

        const currentLang = node.attrs.language;
        if (!currentLang || currentLang === 'auto') {
          const result = lowlight.highlightAuto(text);
          if (result.data && result.data.language) {
            updateAttributes({ language: result.data.language });
          }
        }
      }
    }, 100);
  }, [node.attrs.language, updateAttributes]);

  const setLanguage = useCallback((lang) => {
    updateAttributes({ language: lang === 'auto' ? null : lang });
  }, [updateAttributes]);

  const languageItems = useMemo(() => (
    ['auto', ...LANGUAGES].map((lang) => ({
      id: lang,
      label: lang,
      onClick: () => setLanguage(lang)
    }))
  ), [setLanguage]);

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    copyToClipboard(node.textContent).catch(() => {});
  }, [node.textContent, copyToClipboard]);

  const isSingleLine = !node.textContent.includes('\n');

  return (
    <NodeViewWrapper className={`editor-code-block relative ${isSingleLine ? 'single-line' : ''}`}>
      <div className="editor-code-block-header absolute top-2 right-2 text-xs font-mono z-10 flex items-center gap-1">
        {!isSingleLine && (
          <MenuDropdown
            items={languageItems}
            selectedItemId={language}
            showTickMark={false}
            placement="bottom-end"
            menuClassName="flex flex-col max-h-64 overflow-y-auto"
            {...EDITOR_MENU_DROPDOWN_PROPS}
          >
            <div
              className="editor-code-block-lang-selector flex items-center gap-1 cursor-pointer px-2 py-1 rounded transition-colors duration-150"
              data-testid="code-block-lang-selector"
            >
              <span>{language}</span>
              <IconChevronDown size={14} />
            </div>
          </MenuDropdown>
        )}
        <button
          type="button"
          className="editor-code-block-copy flex items-center justify-center cursor-pointer p-1 rounded transition-colors duration-150"
          data-testid="code-block-copy-btn"
          onClick={handleCopy}
          title="Copy code"
          aria-label="Copy code"
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </button>
      </div>
      <pre ref={preRef} onPaste={handlePaste} data-testid="code-block-pre">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

export default EditorCodeBlock;
