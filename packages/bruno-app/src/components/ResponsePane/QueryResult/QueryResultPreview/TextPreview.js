import React from 'react';

const TextPreview = React.memo(({ data }) => {
  const displayData = React.useMemo(() => {
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

  return (
    <div className="p-4 font-mono text-[13px] whitespace-pre-wrap break-words overflow-auto overflow-x-hidden w-full max-w-full h-full">
      {displayData}
    </div>
  );
});

export default TextPreview;
