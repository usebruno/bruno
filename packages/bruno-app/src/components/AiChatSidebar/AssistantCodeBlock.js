import { useState, useRef, useEffect } from 'react';
import { IconCopy, IconCheck } from '@tabler/icons';

const AssistantCodeBlock = ({ content, language, isOpen, isStreaming, isLast }) => {
  const [isCopied, setIsCopied] = useState(false);
  const preRef = useRef(null);

  useEffect(() => {
    if (isStreaming && isOpen && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [content, isStreaming, isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="assistant-code-block">
      <div className="assistant-code-block__header">
        <div className="assistant-code-block__meta">
          <span className="assistant-code-block__lang">{language || 'code'}</span>
          {isOpen && <span className="assistant-code-block__spinner" />}
        </div>
        <button className="assistant-code-block__btn" onClick={handleCopy} title="Copy">
          {isCopied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre ref={preRef} className="assistant-code-block__body">
        <code className={`language-${language || 'text'}`}>
          {content}
          {isStreaming && isLast && <span className="cursor">|</span>}
        </code>
      </pre>
    </div>
  );
};

export default AssistantCodeBlock;
