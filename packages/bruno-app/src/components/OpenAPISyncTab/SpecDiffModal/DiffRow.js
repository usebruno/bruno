import React from 'react';

/**
 * One virtualized row in the spec diff. Renders the side-by-side cells
 * (left line number, left code, right line number, right code) for a normal
 * row, or a single full-width cell for a hunk header.
 *
 * Paired del+ins rows render via dangerouslySetInnerHTML so the <del>/<ins>
 * markup from the word-level diff cache shows through. Solo rows render as
 * React text children and let React handle escaping.
 */
const DiffRow = ({ row, active, cache }) => {
  if (!row) return null; // guard: Virtuoso race on rapid open/close or theme switch
  if (row.leftKind === 'hunk') {
    return (
      <div className="diff-row diff-row-hunk">
        <div className="diff-cell-hunk">{row.leftText}</div>
      </div>
    );
  }

  const isChange = row.leftKind === 'del' && row.rightKind === 'ins';
  const wd = isChange ? cache.getWordDiff(row.leftText, row.rightText) : null;

  const renderContent = (text, html) =>
    html !== null
      ? <span className="diff-content" dangerouslySetInnerHTML={{ __html: html }} />
      : <span className="diff-content">{text}</span>;

  return (
    <div className={`diff-row ${active ? 'diff-row-focused' : ''}`}>
      <div className={`diff-cell-num diff-kind-${row.leftKind}`}>{row.leftNum ?? ''}</div>
      <div className={`diff-cell-code diff-kind-${row.leftKind}`}>
        <span className="diff-prefix">{row.leftKind === 'del' ? '-' : ' '}</span>
        {renderContent(row.leftText, wd ? wd.left : null)}
      </div>
      <div className={`diff-cell-num diff-kind-${row.rightKind}`}>{row.rightNum ?? ''}</div>
      <div className={`diff-cell-code diff-kind-${row.rightKind}`}>
        <span className="diff-prefix">{row.rightKind === 'ins' ? '+' : ' '}</span>
        {renderContent(row.rightText, wd ? wd.right : null)}
      </div>
    </div>
  );
};

export default React.memo(DiffRow);
