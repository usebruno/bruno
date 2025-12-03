import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconLoader2 } from '@tabler/icons';
import { getSystemProxyVariables } from 'providers/ReduxStore/slices/app';

const SystemProxy = () => {
  const dispatch = useDispatch();
  const systemProxyVariables = useSelector((state) => state.app.systemProxyVariables);
  const { source, http_proxy, https_proxy, no_proxy } = systemProxyVariables || {};
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);

  const SOURCE_LABELS = {
    'environment': 'Environment Variables',
    'windows-system': 'Windows System Settings',
    'macos-system': 'macOS System Settings',
    'linux-system': 'Linux System Settings'
  };

  useEffect(() => {
    dispatch(getSystemProxyVariables())
      .then(() => setError(null))
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setIsFetching(false));
  }, [dispatch]);

  return (
    <>
      <div className="mb-3 text-muted system-proxy-settings space-y-4">
        <div className="flex items-start justify-start flex-col gap-2 mt-2">
          <div className="flex flex-row items-center gap-2">
            <div>
              <h2 className="text-xs text-gray-900 dark:text-gray-100">
                System Proxy {isFetching ? <IconLoader2 className="animate-spin ml-1" size={18} strokeWidth={1.5} /> : null}
              </h2>
              <small className="text-gray-500 dark:text-gray-400">
                Below values are sourced from your system proxy settings.
              </small>
            </div>
          </div>
        </div>
        {error && (
          <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <small className="text-red-600 dark:text-red-400">
              Error loading system proxy settings: {error}
            </small>
          </div>
        )}
        {source && (
          <div className="mb-2">
            <small className="font-medium flex flex-row gap-2">
              <div className="opacity-70 text-xs">
                Proxy source:
              </div>
              <div>
                {SOURCE_LABELS[source] || source}
              </div>
            </small>
          </div>
        )}
        <small>
          These values cannot be directly updated in Bruno. Please refer to your OS documentation to update these.
        </small>
        <div className="flex flex-col justify-start items-start pt-2">
          <div className="mb-1 flex items-center">
            <label className="settings-label">
              http_proxy
            </label>
            <div className="opacity-80 text-indigo-600 dark:text-indigo-400">{http_proxy || '-'}</div>
          </div>
          <div className="mb-1 flex items-center">
            <label className="settings-label">
              https_proxy
            </label>
            <div className="opacity-80 text-indigo-600 dark:text-indigo-400">{https_proxy || '-'}</div>
          </div>
          <div className="mb-1 flex items-center">
            <label className="settings-label">
              no_proxy
            </label>
            <div className="opacity-80 text-indigo-600 dark:text-indigo-400">{no_proxy || '-'}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SystemProxy;
