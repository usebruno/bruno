import { useEffect, useRef } from 'react';
import { IconLoader2, IconFile, IconAlertTriangle } from '@tabler/icons';
import { loadLargeRequest, parseRequestOnDemand } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const RequestNotLoaded = ({ collection, item }) => {
  const dispatch = useDispatch();
  const parseTriggered = useRef(false);

  const handleLoadLargeRequest = () => {
    !item?.loading && dispatch(loadLargeRequest({ collectionUid: collection?.uid, pathname: item?.pathname }));
  };

  // Auto-trigger full parse for deferred items only.
  // item.deferredParse is set explicitly by collection-watcher when deferred-parse beta flag is ON.
  // Large-file placeholders (>2.5MB) also have partial=true but do NOT have deferredParse,
  // so they still go through the manual loadLargeRequest/redaction flow.
  const isDeferredItem = item?.deferredParse === true && !item?.loading;

  useEffect(() => {
    if (isDeferredItem && !parseTriggered.current) {
      parseTriggered.current = true;
      dispatch(parseRequestOnDemand({
        collectionUid: collection?.uid,
        pathname: item?.pathname,
        collectionPath: collection?.pathname
      }));
    }
  }, [isDeferredItem]);

  // For deferred items, show a simple loading state
  if (isDeferredItem) {
    return (
      <StyledWrapper>
        <div className="flex flex-col items-center justify-center p-8">
          <IconLoader2 className="animate-spin mb-2" size={24} strokeWidth={2} />
          <span>Loading request...</span>
        </div>
      </StyledWrapper>
    );
  }

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

            {!item?.error && (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 title bg-yellow-50 dark:bg-yellow-900/20">
                  <IconAlertTriangle size={16} className="text-yellow-500" />
                  <span>The request wasn't loaded due to its large size. Please try again with the following options:</span>
                </div>
                <div className="flex flex-row mt-6 items-center gap-2 w-full">
                  <button
                    className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${item?.loading ? 'opacity-50 cursor-blocked' : ''}`}
                    onClick={handleLoadLargeRequest}
                  >
                    Load Request
                  </button>
                  <p>(Uses a regex based parsing approach)</p>
                </div>
              </div>
            )}

            {item?.loading && (
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
