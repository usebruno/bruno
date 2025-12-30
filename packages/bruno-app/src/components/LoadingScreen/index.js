import { IconLoader2 } from '@tabler/icons';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-900 transition-all duration-300">
      <div className="flex flex-col items-center">
        <IconLoader2
          className="animate-spin h-12 w-12 mb-4 text-zinc-600 dark:text-zinc-400"
          strokeWidth={1.5}
        />
        <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
          Loading Bruno
        </h3>
      </div>
    </div>
  );
};

export default LoadingScreen;
