import { IconLoader2, IconFile } from '@tabler/icons';
import { loadRequest, loadRequestViaWorker } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const RequestNotLoaded = ({ collection, item }) => {
  const dispatch = useDispatch();
  const handleLoadRequestViaWorker = () => {
    !item?.loading && dispatch(loadRequestViaWorker({ collectionUid: collection?.uid, pathname: item?.pathname }));
  }

  const handleLoadRequest = () => {
    !item?.loading && dispatch(loadRequest({ collectionUid: collection?.uid, pathname: item?.pathname }));
  }

  return <StyledWrapper>
    <div className='flex flex-col p-4'>
      <div className='card shadow-sm rounded-md p-4 w-[600px]'>
        <div>
          <div className='font-medium flex items-center gap-2 pb-4'>
            <IconFile size={16} strokeWidth={1.5} className="text-gray-400" />
            File Info
          </div>
          <div className='hr'/>

          <div className='flex items-center mt-2'>
            <span className='w-12 mr-2 text-muted'>Name:</span>
            <div>{item?.name}</div>
          </div>
          
          <div className='flex items-center mt-1'>
            <span className='w-12 mr-2 text-muted'>Path:</span>
            <div className='break-all'>{item?.pathname}</div>
          </div>
          
          <div className='flex items-center mt-1 pb-4'>
            <span className='w-12 mr-2 text-muted'>Size:</span>
            <div>{item?.size?.toFixed?.(2)} MB</div>
          </div>

          {!item?.error && (
            <>
              <div className='hr'/>
              <div className='text-muted text-xs mt-4 mb-2'>
                Due to its large size, this request wasn't loaded automatically.
              </div>
              <div className='flex flex-col gap-6 mt-4'>
                <div className='flex flex-col'>
                  <button 
                    className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${item?.loading? 'opacity-50 cursor-blocked': ''}`} 
                    onClick={handleLoadRequest}
                  >
                    Load Request
                  </button>
                  <small className='text-muted mt-1'>
                    May cause the app to freeze temporarily while it runs.
                  </small>
                </div>
                <div className='flex flex-col'>
                  <button 
                    className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${item?.loading? 'opacity-50 cursor-blocked': ''}`} 
                    onClick={handleLoadRequestViaWorker}
                  >
                    Load Request in Background
                  </button>
                  <small className='text-muted mt-1'>
                    Runs in background.
                  </small>
                </div>
              </div>
            </>
          )}

          {item?.loading && (
            <>
              <div className='hr mt-4'/>
              <div className='flex items-center gap-2 mt-4'>
                <IconLoader2 className="animate-spin" size={16} strokeWidth={2} />
                <span>Loading...</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </StyledWrapper>
}

export default RequestNotLoaded;