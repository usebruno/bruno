import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconLoader2 } from '@tabler/icons';
import { getSystemProxyVariables } from 'providers/ReduxStore/slices/app';
import StyledWrapper from '../StyledWrapper';

const SystemProxy = () => {
  const dispatch = useDispatch();
  const systemProxyVariables = useSelector((state) => state.app.systemProxyVariables);
  const { source, http_proxy, https_proxy, no_proxy } = systemProxyVariables || {};
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(getSystemProxyVariables())
      .then(() => setError(null))
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setIsFetching(false));
  }, [dispatch]);

  return (
    <StyledWrapper>
      <div className="mb-3 text-muted system-proxy-settings space-y-4">
        <div className="flex items-start justify-start flex-col gap-2 mt-2">
          <div className="flex flex-row items-center gap-2">
            <div>
              <h2 className="text-xs system-proxy-title">
                System Proxy {isFetching ? <IconLoader2 className="animate-spin ml-1" size={18} strokeWidth={1.5} /> : null}
              </h2>
              <small className="system-proxy-description">
                Below values are sourced from your system proxy settings.
              </small>
            </div>
          </div>
        </div>
        {error && (
          <div className="mb-2 p-3 system-proxy-error-container rounded">
            <small className="system-proxy-error-text">
              Error loading system proxy settings: {error}
            </small>
          </div>
        )}
        {source && (
          <div className="mb-2">
            <small className="font-medium flex flex-row gap-2">
              <div className="system-proxy-source-label text-xs">
                Proxy source:
              </div>
              <div className="system-proxy-source-value">
                {source}
              </div>
            </small>
          </div>
        )}
        <small className="system-proxy-info-text">
          These values cannot be directly updated in Bruno. Please refer to your OS documentation to update these.
        </small>
        <div className="flex flex-col justify-start items-start pt-2">
          <div className="mb-1 flex items-center">
            <label className="settings-label">
              http_proxy
            </label>
            <div className="system-proxy-value">{http_proxy || '-'}</div>
          </div>
          <div className="mb-1 flex items-center">
            <label className="settings-label">
              https_proxy
            </label>
            <div className="system-proxy-value">{https_proxy || '-'}</div>
          </div>
          <div className="mb-1 flex items-center">
            <label className="settings-label">
              no_proxy
            </label>
            <div className="system-proxy-value">{no_proxy || '-'}</div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default SystemProxy;
