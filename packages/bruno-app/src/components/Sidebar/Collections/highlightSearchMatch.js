import React from 'react';

const highlightSearchMatch = (text, query) => {
  if (typeof text !== 'string') return text;
  const needle = query?.trim().toLowerCase();
  if (!needle) return text;

  const parts = [];
  const lowerText = text.toLowerCase();
  let cursor = 0;
  let match = lowerText.indexOf(needle);

  while (match !== -1) {
    parts.push(text.slice(cursor, match));
    parts.push(<span className="search-match" key={match}>{text.slice(match, match + needle.length)}</span>);
    cursor = match + needle.length;
    match = lowerText.indexOf(needle, cursor);
  }

  return parts.length ? [...parts, text.slice(cursor)] : text;
};

export default highlightSearchMatch;
