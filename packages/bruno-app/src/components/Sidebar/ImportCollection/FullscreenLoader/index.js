import { useState, useEffect } from 'react';
import { IconLoader2 } from '@tabler/icons';

// Messages to cycle through while loading
const loadingMessages = [
  'Processing collection...',
  'Analyzing requests...',
  'Translating scripts...',
  'Preparing collection...',
  'Almost done...',
];

const FullscreenLoader = ({ isLoading }) => {
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    if (!isLoading) return;

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 2000);

    setLoadingMessage(loadingMessages[0]);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center p-8 rounded-lg bg-white dark:bg-zinc-800 shadow-lg max-w-md text-center">
        <IconLoader2 className="animate-spin h-12 w-12 mb-4" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">{loadingMessage}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This may take a moment depending on the collection size
        </p>
      </div>
    </div>
  );
};

export default FullscreenLoader;
