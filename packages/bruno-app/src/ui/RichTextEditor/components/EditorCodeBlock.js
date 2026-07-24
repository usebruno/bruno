import React, { useCallback, useState, useRef } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import Dropdown from '../../../components/Dropdown';
import { IconChevronDown, IconCopy, IconCheck } from '@tabler/icons';
import { lowlight } from 'lowlight';

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

export const EditorCodeBlock = ({ node, updateAttributes, extension }) => {
  const language = node.attrs.language || 'auto';
  const [copied, setCopied] = useState(false);
  const preRef = useRef(null);

  const handlePaste = useCallback(() => {
    setTimeout(() => {
      if (preRef.current) {
        const text = preRef.current.textContent;
        if (!text) return;
        const result = lowlight.highlightAuto(text);
        if (result.data && result.data.language && LANGUAGES.includes(result.data.language)) {
          updateAttributes({ language: result.data.language });
        }
      }
    }, 10);
  }, [updateAttributes]);

  const setLanguage = useCallback((event) => {
    event.preventDefault();
    const lang = event.target.dataset.language;
    updateAttributes({ language: lang === 'auto' ? null : lang });
  }, [updateAttributes]);

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(node.textContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [node.textContent]);

  const onDropdownCreate = (ref) => { };

  const isSingleLine = !node.textContent.includes('\n');

  return (
    <NodeViewWrapper className={`editor-code-block relative ${isSingleLine ? 'single-line' : ''}`}>
      <div className="editor-code-block-header absolute top-2 right-2 text-xs font-mono text-gray-500 z-10 flex items-center gap-1">
        {!isSingleLine && (
          <Dropdown
            onCreate={onDropdownCreate}
            appendTo={() => document.body}
            icon={(
              <div className="editor-code-block-lang-selector flex items-center gap-1 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors duration-150">
                <span>{language}</span>
                <IconChevronDown size={14} />
              </div>
            )}
            placement="bottom-end"
          >
            <div className="flex flex-col max-h-64 overflow-y-auto">
              <div
                className={`dropdown-item ${language === 'auto' ? 'active' : ''} px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700`}
                data-language="auto"
                onClick={setLanguage}
              >
                auto
              </div>
              {LANGUAGES.map((lang) => (
                <div
                  key={lang}
                  className={`dropdown-item ${language === lang ? 'active' : ''} px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700`}
                  data-language={lang}
                  onClick={setLanguage}
                >
                  {lang}
                </div>
              ))}
            </div>
          </Dropdown>
        )}
        <div
          className="editor-code-block-copy flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 p-1 rounded transition-colors duration-150"
          onClick={handleCopy}
          title="Copy code"
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </div>
      </div>
      <pre ref={preRef} onPaste={handlePaste}>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};
