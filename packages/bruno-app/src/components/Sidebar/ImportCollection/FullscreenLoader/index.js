import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IconLoader2 } from '@tabler/icons';

const FullscreenLoader = ({ isLoading }) => {
  const { t } = useTranslation();
  const [messageIndex, setMessageIndex] = useState(0);

  const loadingMessages = useMemo(() => [
    t('SIDEBAR.PROCESSING_COLLECTION'),
    t('SIDEBAR.ANALYZING_REQUESTS'),
    t('SIDEBAR.TRANSLATING_SCRIPTS'),
    t('SIDEBAR.PREPARING_COLLECTION'),
    t('SIDEBAR.ALMOST_DONE')
  ], [t]);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    setMessageIndex(0);

    return () => clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center p-8 rounded-lg bg-white dark:bg-zinc-800 shadow-lg max-w-md text-center">
        <IconLoader2 className="animate-spin h-12 w-12 mb-4" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">{loadingMessages[messageIndex]}</h3>
        <p className="text-zinc-500 dark:text-zinc-400">
          {t('SIDEBAR.THIS_MAY_TAKE_A_MOMENT')}
        </p>
      </div>
    </div>
  );
};

export default FullscreenLoader;
