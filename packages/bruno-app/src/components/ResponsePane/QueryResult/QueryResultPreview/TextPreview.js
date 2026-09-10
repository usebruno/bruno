import LinkifyIt from 'linkify-it';
import React, { Fragment, memo, useMemo, useState } from 'react';
import { isHttpUrl } from 'utils/url';

const linkify = new LinkifyIt();

const CHUNK_SIZE = 300;

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

  // Resets the cap when segments changes - a new response arrived
  const [visibleCount, setVisibleCount] = useState(Math.min(segments.length, CHUNK_SIZE));
  const [prevSegments, setPrevSegments] = useState(segments);
  if (segments !== prevSegments) {
    setPrevSegments(segments);
    setVisibleCount(Math.min(segments.length, CHUNK_SIZE));
  }

  const remaining = segments.length - visibleCount;

  return (
    <div
      data-testid="text-preview-container"
      className="p-4 font-mono text-[13px] whitespace-pre-wrap break-words overflow-auto overflow-x-hidden w-full max-w-full h-full"
    >
      {segments.slice(0, visibleCount).map((segment, index) =>
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
      {remaining > 0 && (
        <button
          type="button"
          data-testid="text-preview-show-more"
          className="block mt-2 px-2 py-1 rounded border border-current text-xs font-semibold not-italic no-underline opacity-80 hover:opacity-100"
          onClick={() => setVisibleCount((count) => Math.min(count + CHUNK_SIZE, segments.length))}
        >
          Show {Math.min(remaining, CHUNK_SIZE)} more ({remaining} remaining)
        </button>
      )}
    </div>
  );
});

export default TextPreview;
