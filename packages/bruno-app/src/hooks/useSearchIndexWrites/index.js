import { useEffect, useRef } from 'react';

const useSearchIndexWrites = (onWrite) => {
  const onWriteRef = useRef(onWrite);
  onWriteRef.current = onWrite;

  useEffect(() => window.ipcRenderer.on('main:search-index-written', () => onWriteRef.current()), []);
};

export default useSearchIndexWrites;
