import { IconLoader2, IconFile, IconAlertTriangle, IconRefresh } from '@tabler/icons';
import { loadLargeRequest, loadRequestOnDemand } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import { useState } from 'react';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const RequestNotLoaded = ({ collection, item }) => {
  const dispatch = useDispatch();
  const [isRetrying, setIsRetrying] = useState(false);
  const [loadError, setLoadError] = useState(item?.loadError || null);

  const handleLoadLargeRequest = () => {
    if (item?.loading || isRetrying) return;

    setIsRetrying(true);
    setLoadError(null);

    dispatch(loadLargeRequest({ collectionUid: collection?.uid, pathname: item?.pathname }))
      .catch((error) => {
        console.error('Error loading large request:', error);
        setLoadError(error?.message || 'Failed to load request');
        toast.error(error?.message || 'Failed to load request');
      })
      .finally(() => {
        setIsRetrying(false);
      });
  };

  const handleRetryLoad = () => {
    if (item?.loading || isRetrying || !item?.pathname) return;

    setIsRetrying(true);
    setLoadError(null);

    dispatch(loadRequestOnDemand({
      collectionUid: collection?.uid,
      pathname: item.pathname
    }))
      .then(() => {
        toast.success('Request loaded successfully');
      })
      .catch((error) => {
        console.error('Error loading request on demand:', error);
        const errorMessage = error?.message || 'Failed to load request';
        setLoadError(errorMessage);
        toast.error(errorMessage);
      })
      .finally(() => {
        setIsRetrying(false);
      });
  };

  // Check if this is a large file error (from previous implementation)
  const isLargeFileError = item?.error && !item?.loadError && !loadError;

  // Check if this is a lazy loading scenario (partial request)
  const isLazyLoadingScenario = item?.partial && !item?.error && !isLargeFileError;

  return (
    <StyledWrapper>
      <div className="flex flex-col p-4">
        <div className="card shadow-sm rounded-md p-4 w-[685px]">
          <div>
            <div className="font-medium flex items-center gap-2 pb-4">
              <IconFile size={16} strokeWidth={1.5} className="text-gray-400" />
              File Info
            </div>
            <div className="hr" />

            <div className="flex items-center mt-2">
              <span className="w-12 mr-2 text-muted">Name:</span>
              <div>{item?.name}</div>
            </div>

            <div className="flex items-center mt-1">
              <span className="w-12 mr-2 text-muted">Path:</span>
              <div className="break-all">{item?.pathname}</div>
            </div>

            <div className="flex items-center mt-1 pb-4">
              <span className="w-12 mr-2 text-muted">Size:</span>
              <div>{item?.size?.toFixed?.(2)} MB</div>
            </div>

            {/* Error message display */}
            {(loadError || item?.loadError) && (
              <div className="flex flex-col mb-4">
                <div className="flex items-center gap-2 px-3 py-2 title bg-red-50 dark:bg-red-900/20 rounded">
                  <IconAlertTriangle size={16} className="text-red-500" />
                  <span className="text-red-700 dark:text-red-400">
                    {loadError || item?.loadError || 'Failed to load request'}
                  </span>
                </div>
                <div className="flex flex-row mt-4 items-center gap-2 w-full">
                  <button
                    className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${isRetrying || item?.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleRetryLoad}
                    disabled={isRetrying || item?.loading}
                  >
                    <IconRefresh size={14} />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Large file error (legacy) */}
            {isLargeFileError && !loadError && (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 title bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <IconAlertTriangle size={16} className="text-yellow-500" />
                  <span>The request wasn't loaded due to its large size. Please try again with the following options:</span>
                </div>
                <div className="flex flex-row mt-6 items-center gap-2 w-full">
                  <button
                    className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${item?.loading || isRetrying ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleLoadLargeRequest}
                    disabled={item?.loading || isRetrying}
                  >
                    Load Request
                  </button>
                  <p>(Uses a regex based parsing approach)</p>
                </div>
              </div>
            )}

            {/* Lazy loading scenario - request not yet loaded */}
            {isLazyLoadingScenario && !loadError && (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 title bg-blue-50 dark:bg-blue-900/20 rounded">
                  <IconAlertTriangle size={16} className="text-blue-500" />
                  <span>This request hasn't been loaded yet. Click the button below to load it.</span>
                </div>
                <div className="flex flex-row mt-6 items-center gap-2 w-full">
                  <button
                    className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${item?.loading || isRetrying ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleRetryLoad}
                    disabled={item?.loading || isRetrying}
                  >
                    {isRetrying ? (
                      <>
                        <IconLoader2 className="animate-spin" size={14} />
                        Loading...
                      </>
                    ) : (
                      <>
                        <IconRefresh size={14} />
                        Load Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {(item?.loading || isRetrying) && (
              <>
                <div className="hr mt-4" />
                <div className="flex items-center gap-2 mt-4">
                  <IconLoader2 className="animate-spin" size={16} strokeWidth={2} />
                  <span>Loading...</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default RequestNotLoaded;
