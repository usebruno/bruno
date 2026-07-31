import React, { useCallback, useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import Dropdown from '../../../../components/Dropdown';
import { IconChevronDown, IconCopy, IconCheck } from '@tabler/icons';
import { lowlight } from 'lowlight';
import protobuf from 'highlight.js/lib/languages/protobuf';

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
  const [copied, setCopied] = useState(false);
  const preRef = useRef(null);
  const pasteTimeoutRef = useRef(null);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pasteTimeoutRef.current) clearTimeout(pasteTimeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
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
    }, 10);
  }, [node.attrs.language, updateAttributes]);

  const setLanguage = useCallback((event) => {
    event.preventDefault();
    const lang = event.currentTarget.dataset.language;
    updateAttributes({ language: lang === 'auto' ? null : lang });
  }, [updateAttributes]);

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(node.textContent).then(() => {
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopied(false);
    });
  }, [node.textContent]);

  const isSingleLine = !node.textContent.includes('\n');

  return (
    <NodeViewWrapper className={`editor-code-block relative ${isSingleLine ? 'single-line' : ''}`}>
      <div className="editor-code-block-header absolute top-2 right-2 text-xs font-mono text-gray-500 z-10 flex items-center gap-1">
        {!isSingleLine && (
          <Dropdown
            appendTo={() => document.body}
            icon={(
              <div
                className="editor-code-block-lang-selector flex items-center gap-1 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors duration-150"
                data-testid="code-block-lang-selector"
              >
                <span>{language}</span>
                <IconChevronDown size={14} />
              </div>
            )}
            placement="bottom-end"
          >
            <div className="flex flex-col max-h-64 overflow-y-auto">
              <button
                className={`dropdown-item ${language === 'auto' ? 'active' : ''} px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700`}
                data-language="auto"
                data-testid="code-block-lang-option"
                onClick={setLanguage}
              >
                auto
              </button>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={`dropdown-item ${language === lang ? 'active' : ''} px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700`}
                  data-language={lang}
                  data-testid="code-block-lang-option"
                  onClick={setLanguage}
                >
                  {lang}
                </button>
              ))}
            </div>
          </Dropdown>
        )}
        <button
          type="button"
          className="editor-code-block-copy flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 p-1 rounded transition-colors duration-150"
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
