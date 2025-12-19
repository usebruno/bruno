import { useState, useEffect } from 'react';
import { IconLoader2 } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

// Messages to cycle through while loading
const loadingMessages = [
  'Processing collection...',
  'Analyzing requests...',
  'Translating scripts...',
  'Preparing collection...',
  'Almost done...'
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
    <StyledWrapper>
      <div className="loader-backdrop fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-all duration-300">
        <div className="loader-card flex flex-col items-center p-8 rounded-lg shadow-lg max-w-md text-center">
          <IconLoader2 className="animate-spin h-12 w-12 mb-4" strokeWidth={1.5} />
          <h3 className="loader-heading text-lg font-medium mb-2">{loadingMessage}</h3>
          <p className="loader-text">
            This may take a moment depending on the collection size
          </p>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default FullscreenLoader;
