import React, { useMemo, useState } from 'react';
import { diffLines } from 'diff';
import toast from 'react-hot-toast';
import { IconCopy, IconCheck } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const DiffView = ({ original = '', proposed = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(proposed);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const diffResult = useMemo(() => {
    const changes = diffLines(original, proposed);
    let addedLines = 0;
    let removedLines = 0;
    let lineNumber = 1;

    const lines = [];

    changes.forEach((part) => {
      const partLines = part.value.split('\n');
      // Remove last empty element if the string ends with newline
      if (partLines[partLines.length - 1] === '') {
        partLines.pop();
      }

      partLines.forEach((line) => {
        if (part.added) {
          addedLines++;
          lines.push({
            type: 'added',
            content: line,
            lineNumber: lineNumber++,
            prefix: '+'
          });
        } else if (part.removed) {
          removedLines++;
          lines.push({
            type: 'removed',
            content: line,
            lineNumber: null,
            prefix: '-'
          });
        } else {
          lines.push({
            type: 'unchanged',
            content: line,
            lineNumber: lineNumber++,
            prefix: ' '
          });
        }
      });
    });

    return { lines, addedLines, removedLines };
  }, [original, proposed]);

  if (!proposed && !original) {
    return (
      <StyledWrapper>
        <div className="diff-stats">
          <span>No changes</span>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="diff-stats">
        <div className="stats-left">
          <span className="additions">+{diffResult.addedLines} additions</span>
          <span className="deletions">-{diffResult.removedLines} deletions</span>
        </div>
        <button
          onClick={handleCopy}
          className={`copy-btn ${copied ? 'copied' : ''}`}
          title={copied ? 'Copied!' : 'Copy proposed code'}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>
      </div>
      <div className="diff-lines">
        {diffResult.lines.map((line, index) => (
          <div key={index} className={`diff-line ${line.type}`}>
            <span className="line-number">
              {line.lineNumber !== null ? line.lineNumber : ''}
            </span>
            <span className="line-prefix">{line.prefix}</span>
            <span className="line-content">{line.content}</span>
          </div>
        ))}
      </div>
    </StyledWrapper>
  );
};

export default DiffView;
