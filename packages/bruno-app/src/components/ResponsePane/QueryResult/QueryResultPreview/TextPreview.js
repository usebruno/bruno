import React, { memo, useMemo } from 'react';

const TextPreview = memo(({ data }) => {
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
    if (typeof data === 'string') {
      // Historical preview for JSON bodies was JSON.stringify(parsedObject) (compact).
      // Under bodyRef we may receive the raw UTF-8 string instead — normalize for preview.
      try {
        const parsed = JSON.parse(data);
        if (parsed !== null && typeof parsed === 'object') {
          return JSON.stringify(parsed);
        }
      } catch {
        /* not JSON — show as-is */
      }
      return data;
    }
    return String(data);
  }, [data]);

  return (
    <div className="p-4 font-mono text-[13px] whitespace-pre-wrap break-words overflow-auto overflow-x-hidden w-full max-w-full h-full">
      {displayData}
    </div>
  );
});

export default TextPreview;
