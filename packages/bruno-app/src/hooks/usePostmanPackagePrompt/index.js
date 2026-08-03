import { useState, useCallback } from 'react';

const toPairs = (converted, imported) => {
  const convertedList = Array.isArray(converted) ? converted : [converted];
  const importedList = Array.isArray(imported) ? imported : [imported];
  return convertedList
    .map((c, i) => ({
      report: c?.packageReport,
      collectionPath: importedList[i]?.path
    }))
    .filter((entry) => entry.report?.hasAny && entry.collectionPath);
};

const usePostmanPackagePrompt = () => {
  const [queue, setQueue] = useState([]);

  const clearPostmanPackagePrompt = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const handleImportResolved = useCallback((convertedCollection, importedItem) => {
    const pairs = toPairs(convertedCollection, importedItem);
    if (pairs.length === 0) return;
    setQueue((prev) => [...prev, ...pairs]);
  }, []);

  return {
    postmanPackagePrompt: queue[0] || null,
    clearPostmanPackagePrompt,
    handleImportResolved
  };
};

export default usePostmanPackagePrompt;
