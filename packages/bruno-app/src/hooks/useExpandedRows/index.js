import { useState } from 'react';

const useExpandedRows = (rowKeys) => {
  const [isExpandedByKey, setIsExpandedByKey] = useState({});

  const isRowExpanded = (key) => Boolean(isExpandedByKey[key]);
  const areAllRowsExpanded = rowKeys.every(isRowExpanded);

  const toggleRow = (key) => setIsExpandedByKey({ ...isExpandedByKey, [key]: !isRowExpanded(key) });
  const toggleAllRows = () => setIsExpandedByKey(Object.fromEntries(rowKeys.map((key) => [key, !areAllRowsExpanded])));

  return { isRowExpanded, areAllRowsExpanded, toggleRow, toggleAllRows };
};

export default useExpandedRows;
