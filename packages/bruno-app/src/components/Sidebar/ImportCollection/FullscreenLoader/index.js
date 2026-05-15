import { useState, useEffect, useMemo } from 'react';
import { IconLoader2 } from '@tabler/icons';
import { useTranslation } from 'react-i18next';

const FullscreenLoader = ({ isLoading }) => {
  const [loadingMessage, setLoadingMessage] = useState('');
  const { t } = useTranslation();

  const loadingMessages = useMemo(
    () => [
      t('SIDEBAR.IMPORT_LOADING_PROCESSING'),
      t('SIDEBAR.IMPORT_LOADING_ANALYZING'),
      t('SIDEBAR.IMPORT_LOADING_TRANSLATING'),
      t('SIDEBAR.IMPORT_LOADING_PREPARING'),
      t('SIDEBAR.IMPORT_LOADING_ALMOST_DONE')
    ],
    [t]
  );

  useEffect(() => {
    if (!isLoading) return;

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 2000);

    setLoadingMessage(loadingMessages[0]);

    return () => clearInterval(interval);
  }, [isLoading, loadingMessages]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center p-8 rounded-lg bg-white dark:bg-zinc-800 shadow-lg max-w-md text-center">
        <IconLoader2 className="animate-spin h-12 w-12 mb-4" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">{loadingMessage}</h3>
        <p className="text-zinc-500 dark:text-zinc-400">
          {t('SIDEBAR.IMPORT_LOADING_TAKE_MOMENT')}
        </p>
      </div>
    </div>
  );
};

export default FullscreenLoader;
