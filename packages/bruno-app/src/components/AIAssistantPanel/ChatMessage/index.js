import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import CodeBlock from '../CodeBlock/index';
import StyledWrapper from './StyledWrapper';

/**
 * Pre-process content to handle nested backticks
 * Converts nested code fences to use 4 backticks for the outer fence
 */
const preprocessNestedBackticks = (content) => {
  if (!content) return '';

  // Regex to find code blocks with nested backticks
  // Look for ``` followed by content that contains ```
  const lines = content.split('\n');
  const result = [];
  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = '';
  let openingBackticks = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tripleBacktickMatch = line.match(/^(`{3,})(\w*)?$/);

    if (tripleBacktickMatch && !inCodeBlock) {
      // Starting a code block
      inCodeBlock = true;
      openingBackticks = tripleBacktickMatch[1];
      codeBlockLang = tripleBacktickMatch[2] || '';
      codeBlockContent = [];
    } else if (inCodeBlock && line.trim() === openingBackticks) {
      // Ending the code block
      inCodeBlock = false;

      // Check if content has nested backticks
      const contentStr = codeBlockContent.join('\n');
      const hasNestedBackticks = contentStr.includes('```');

      if (hasNestedBackticks) {
        // Use 4 backticks for outer fence
        result.push('````' + codeBlockLang);
        result.push(...codeBlockContent);
        result.push('````');
      } else {
        // Normal code block
        result.push(openingBackticks + codeBlockLang);
        result.push(...codeBlockContent);
        result.push(openingBackticks);
      }
    } else if (inCodeBlock) {
      codeBlockContent.push(line);
    } else {
      result.push(line);
    }
  }

  // If we ended while still in a code block, output what we have
  if (inCodeBlock) {
    const contentStr = codeBlockContent.join('\n');
    const hasNestedBackticks = contentStr.includes('```');

    if (hasNestedBackticks) {
      result.push('````' + codeBlockLang);
      result.push(...codeBlockContent);
      result.push('````');
    } else {
      result.push(openingBackticks + codeBlockLang);
      result.push(...codeBlockContent);
      result.push(openingBackticks);
    }
  }

  return result.join('\n');
};

// Memoized markdown instance to avoid re-creation on every render
const createMarkdownRenderer = () => new MarkdownIt({
  html: false, // Disable HTML for security
  breaks: true, // Convert \n to <br>
  linkify: true, // Auto-detect links
  typographer: true
});

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote',
    'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'span'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
};

/**
 * ChatMessage component that renders messages with proper formatting
 * - User messages: plain text with brand color background
 * - Assistant messages: markdown rendered with syntax highlighting
 * - Error/Success/Info: styled appropriately
 */
const ChatMessage = ({ type, content, isCode = false }) => {
  const renderedContent = useMemo(() => {
    // For code messages, use CodeBlock
    if (isCode) {
      return <CodeBlock code={content} language="javascript" />;
    }

    // For non-assistant messages, return plain text
    if (type !== 'assistant') {
      return content;
    }

    // For assistant text messages, render markdown
    // Pre-process to handle nested backticks (only needed for markdown rendering)
    const processedContent = preprocessNestedBackticks(content);

    // Render markdown
    const md = createMarkdownRenderer();
    const rawHtml = md.render(processedContent);

    // Sanitize with DOMPurify
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);

    return (
      <div
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }, [type, content, isCode]);

  const className = isCode ? `${type} is-code` : type;

  return (
    <StyledWrapper className={className}>
      {renderedContent}
    </StyledWrapper>
  );
};

export default ChatMessage;
