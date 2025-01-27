import { IconLoader2 } from '@tabler/icons';
import { loadRequest, loadRequestSync } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';

const RequestNotLoaded = ({ collection, item }) => {
  const dispatch = useDispatch();
  const handleLoadRequest = () => {
    !item?.loading && dispatch(loadRequest({ collectionUid: collection?.uid, pathname: item?.pathname }));
  }

  const handleLoadRequestSync = () => {
    !item?.loading && dispatch(loadRequestSync({ collectionUid: collection?.uid, pathname: item?.pathname }));
  }

  return <>
    <div className='flex flex-col gap-6 w-fit pt-4 pb-3 px-4'>
      <div className='flex flex-col gap-1'>
        <div className='flex flex-row gap-1'>
          <div className='opacity-70 min-w-[50px]'>Name</div>
          <div>{item?.name}</div>
        </div>
        <div className='flex flex-row gap-1'>
          <div className='opacity-70 min-w-[50px]'>Size</div>
          <div>{item?.size?.toFixed?.(2)} MB</div>
        </div>
        <div className='flex flex-row gap-1'>
          <div className='opacity-70 min-w-[50px]'>Path</div>
          <div>{item?.pathname}</div>
        </div>
      </div>
      <div className='flex flex-col gap-6 w-fit justify-start'>
        <div className='flex flex-col'>
          <button className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${item?.loading? 'opacity-50 cursor-blocked': ''}`} onClick={handleLoadRequestSync}>
            {item?.loading ? `Loading Request` : `Load Request`}
            {item?.loading ? <IconLoader2 className="animate-spin" size={18} strokeWidth={1.5} /> : null}
          </button>
          <small className='text-muted mt-1'>
            May cause the app to freeze temporarily while it runs.
          </small>
        </div>
        <div className='flex flex-col'>
          <button className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${item?.loading? 'opacity-50 cursor-blocked': ''}`} onClick={handleLoadRequest}>
            {item?.loading ? `Loading Request` : `Load Request in Background`}
            {item?.loading ? <IconLoader2 className="animate-spin" size={18} strokeWidth={1.5} /> : null}
          </button>
          <small className='text-muted mt-1'>
            Runs in background.
          </small>
        </div>
      </div>
    </div>
  </>
}

export default RequestNotLoaded;