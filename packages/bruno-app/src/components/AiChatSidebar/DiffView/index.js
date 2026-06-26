import React, { useMemo, useState } from 'react';
import { diffLines } from 'diff';
import { IconCheck, IconX, IconCode, IconChevronDown, IconChevronUp } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CONTEXT_LINES = 2;
const EXPAND_CHUNK_SIZE = 20;

const DiffView = ({ originalCode, newCode, onAccept, onReject, status, contentTypeLabel, warning, disableAccept }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedFromTop, setExpandedFromTop] = useState({});
  const [expandedFromBottom, setExpandedFromBottom] = useState({});

  const diffResult = useMemo(() => {
    const changes = diffLines(originalCode || '', newCode || '');
    let additions = 0;
    let deletions = 0;
    let lineNumber = 1;

    const lines = changes.flatMap((part) => {
      const partLines = part.value.split('\n');
      if (partLines[partLines.length - 1] === '') partLines.pop();

      return partLines.map((line) => {
        const entry = { content: line, lineNumber: null };
        if (part.added) {
          additions += 1;
          entry.type = 'added';
          entry.lineNumber = lineNumber++;
        } else if (part.removed) {
          deletions += 1;
          entry.type = 'removed';
        } else {
          entry.type = 'unchanged';
          entry.lineNumber = lineNumber++;
        }
        return entry;
      });
    });

    return { lines, additions, deletions };
  }, [originalCode, newCode]);

  const hunks = useMemo(() => {
    const { lines } = diffResult;
    if (lines.length === 0) return [];

    const changedIndices = new Set();
    lines.forEach((line, idx) => {
      if (line.type === 'added' || line.type === 'removed') changedIndices.add(idx);
    });

    const visibleIndices = new Set();
    changedIndices.forEach((idx) => {
      for (let i = Math.max(0, idx - CONTEXT_LINES); i <= Math.min(lines.length - 1, idx + CONTEXT_LINES); i++) {
        visibleIndices.add(i);
      }
    });

    const result = [];
    let i = 0;
    while (i < lines.length) {
      if (visibleIndices.has(i)) {
        result.push({ type: 'line', data: lines[i], index: i });
        i += 1;
      } else {
        const start = i;
        while (i < lines.length && !visibleIndices.has(i)) i += 1;
        result.push({
          type: 'collapsed',
          startIndex: start,
          count: i - start,
          lines: lines.slice(start, i)
        });
      }
    }
    return result;
  }, [diffResult]);

  const expandUp = (startIndex, totalLines) => {
    setExpandedFromTop((prev) => {
      const current = prev[startIndex] || 0;
      const bottomExpanded = expandedFromBottom[startIndex] || 0;
      const remaining = totalLines - current - bottomExpanded;
      return { ...prev, [startIndex]: Math.min(current + EXPAND_CHUNK_SIZE, current + remaining) };
    });
  };

  const expandDown = (startIndex, totalLines) => {
    setExpandedFromBottom((prev) => {
      const current = prev[startIndex] || 0;
      const topExpanded = expandedFromTop[startIndex] || 0;
      const remaining = totalLines - topExpanded - current;
      return { ...prev, [startIndex]: Math.min(current + EXPAND_CHUNK_SIZE, current + remaining) };
    });
  };

  if (diffResult.additions === 0 && diffResult.deletions === 0) return null;

  const renderActions = () => {
    if (status === 'accepted') {
      return (
        <span className="status-badge accepted">
          <IconCheck size={12} /> Applied
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="status-badge rejected">
          <IconX size={12} /> Dismissed
        </span>
      );
    }
    return (
      <div className="diff-actions">
        <button className="diff-btn reject" onClick={onReject} title="Dismiss changes">
          <IconX size={12} />
        </button>
        <button className="diff-btn accept" onClick={onAccept} title="Apply changes" disabled={disableAccept}>
          <IconCheck size={12} /> Apply
        </button>
      </div>
    );
  };

  const renderLine = (line, key) => (
    <div key={key} className={`diff-line ${line.type}`}>
      <span className="line-number">{line.type !== 'removed' ? line.lineNumber : ''}</span>
      <span className="line-prefix">{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
      <span className="line-content">{line.content || ' '}</span>
    </div>
  );

  const renderHunks = () =>
    hunks.map((hunk, idx) => {
      if (hunk.type === 'line') return renderLine(hunk.data, `line-${hunk.index}`);

      const topCount = expandedFromTop[hunk.startIndex] || 0;
      const bottomCount = expandedFromBottom[hunk.startIndex] || 0;
      const remainingCount = hunk.count - topCount - bottomCount;

      const topLines = hunk.lines.slice(0, topCount);
      const bottomLines = hunk.lines.slice(hunk.count - bottomCount);
      const isAtTop = idx === 0;
      const isAtBottom = idx === hunks.length - 1;

      return (
        <React.Fragment key={`collapsed-${hunk.startIndex}`}>
          {topLines.map((line, lineIdx) => renderLine(line, `top-${hunk.startIndex}-${lineIdx}`))}

          {remainingCount > 0 && (
            <div className="expand-marker">
              <div className="expand-gutter">
                <div className="expand-buttons">
                  {!isAtTop && (
                    <button className="expand-btn" onClick={() => expandUp(hunk.startIndex, hunk.count)} title="Expand up">
                      <IconChevronUp size={10} />
                    </button>
                  )}
                  {!isAtBottom && (
                    <button className="expand-btn" onClick={() => expandDown(hunk.startIndex, hunk.count)} title="Expand down">
                      <IconChevronDown size={10} />
                    </button>
                  )}
                </div>
              </div>
              <div className="expand-line" />
            </div>
          )}

          {bottomLines.map((line, lineIdx) => renderLine(line, `bottom-${hunk.startIndex}-${lineIdx}`))}
        </React.Fragment>
      );
    });

  return (
    <StyledWrapper className={status || ''}>
      <div className="diff-header">
        <div className="diff-title">
          <span className="diff-icon"><IconCode size={12} /></span>
          {contentTypeLabel && <span className="diff-content-type">{contentTypeLabel}</span>}
          <div className="diff-stats">
            <span className="stat additions">+{diffResult.additions}</span>
            <span className="stat deletions">-{diffResult.deletions}</span>
          </div>
        </div>
        {renderActions()}
      </div>

      {warning && (
        <div className={`diff-warning ${disableAccept ? 'error' : 'warn'}`}>
          {warning}
        </div>
      )}

      {isExpanded && <div className="diff-content">{renderHunks()}</div>}

      <button className="diff-toggle" onClick={() => setIsExpanded((v) => !v)}>
        {isExpanded ? (
          <><IconChevronUp size={12} /> Hide</>
        ) : (
          <><IconChevronDown size={12} /> Show ({diffResult.additions + diffResult.deletions})</>
        )}
      </button>
    </StyledWrapper>
  );
};

export default DiffView;
