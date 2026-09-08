import React, { Fragment, memo, useMemo } from 'react';
import LinkifyIt from 'linkify-it';
import { isHttpUrl } from 'utils/url';

const linkify = new LinkifyIt();

const TextPreview = memo(({ data, onLinkClick }) => {
  const displayData = useMemo(() => {
    if (data === null || data === undefined) {
      return String(data);
    }
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data);
      } catch {
        return String(data);
      }
    }
    return String(data);
  }, [data]);

  // Split into plain-text and URL segments so only genuine http(s) links (never a bare
  // //host, ftp:, or mailto: match) become clickable - everything else renders as-is.
  const segments = useMemo(() => {
    if (typeof onLinkClick !== 'function') {
      return [{ text: displayData }];
    }

    const matches = linkify.match(displayData);
    if (!matches?.length) {
      return [{ text: displayData }];
    }

    const parts = [];
    let cursor = 0;
    matches.forEach((match) => {
      if (!isHttpUrl(match.url)) return;
      if (match.index > cursor) {
        parts.push({ text: displayData.slice(cursor, match.index) });
      }
      parts.push({ text: match.raw, url: match.url });
      cursor = match.lastIndex;
    });
    if (cursor < displayData.length) {
      parts.push({ text: displayData.slice(cursor) });
    }
    return parts;
  }, [displayData, onLinkClick]);

  return (
    <div className="p-4 font-mono text-[13px] whitespace-pre-wrap break-words overflow-auto overflow-x-hidden w-full max-w-full h-full">
      {segments.map((segment, index) =>
        segment.url ? (
          <span
            key={index}
            data-testid="text-preview-link"
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => onLinkClick(segment.url)}
          >
            {segment.text}
          </span>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        )
      )}
    </div>
  );
});

export default TextPreview;
