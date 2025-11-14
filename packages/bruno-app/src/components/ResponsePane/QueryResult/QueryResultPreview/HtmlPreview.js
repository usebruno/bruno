import React from 'react';
import { escapeHtml, isValidHtml } from 'utils/common/index';

const HtmlPreview = React.memo(({ data, baseUrl }) => {
  if (isValidHtml(data)) {
    const htmlContent = data.includes('<head>')
      ? data.replace('<head>', `<head><base href="${escapeHtml(baseUrl)}">`)
      : `<head><base href="${escapeHtml(baseUrl)}"></head>${data}`;

    return (
      <webview
        src={`data:text/html; charset=utf-8,${encodeURIComponent(htmlContent)}`}
        webpreferences="disableDialogs=true, javascript=yes"
        className="h-full bg-white"
      />
    );
  }

  // For all other data types, render safely as formatted text
  let displayContent = '';
  if (data === null || data === undefined) {
    displayContent = String(data);
  } else if (typeof data === 'object') {
    displayContent = JSON.stringify(data, null);
  } else if (typeof data === 'string') {
    displayContent = data;
  } else {
    displayContent = String(data);
  }

  return (
    <pre
      className="bg-white font-mono text-[13px] whitespace-pre-wrap break-words overflow-auto overflow-x-hidden p-4 text-[#24292f] w-full max-w-full h-full box-border relative"
    >
      {displayContent}
    </pre>
  );
});

export default HtmlPreview;
