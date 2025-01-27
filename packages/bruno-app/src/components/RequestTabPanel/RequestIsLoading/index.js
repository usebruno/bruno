import { IconLoader2 } from '@tabler/icons';

const RequestIsLoading = ({ item }) => {
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
        <div className='flex flex-col gap-6 w-fit justify-start'>
          <IconLoader2 className="animate-spin" size={18} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  </>
}

export default RequestIsLoading;