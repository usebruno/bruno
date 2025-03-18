import { IconLoader2, IconFile } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const RequestIsLoading = ({ item }) => {
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
            <div>
              {item?.name}
            </div>
          </div>
          
          <div className='flex items-center mt-1'>
            <span className='w-12 mr-2 text-muted'>Path:</span>
            <div className='break-all'>
              {item?.pathname}
            </div>
          </div>
          
          <div className='flex items-center mt-1 pb-4'>
            <span className='w-12 mr-2 text-muted'>Size:</span>
            <div>
              {item?.size?.toFixed?.(2)} MB
            </div>
          </div>

          <div className='hr'/>
          <div className='flex items-center gap-2 mt-4'>
            <IconLoader2 className="animate-spin" size={16} strokeWidth={2} />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    </div>
  </StyledWrapper>
}

export default RequestIsLoading;