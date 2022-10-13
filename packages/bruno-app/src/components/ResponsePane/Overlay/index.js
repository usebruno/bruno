import React from 'react';
import { IconRefresh } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { cancelRequest } from 'providers/ReduxStore/slices/collections/actions';
import StopWatch from '../../StopWatch';
import StyledWrapper from './StyledWrapper';

const ResponseLoadingOverlay = ({item, collection}) => {
  const dispatch = useDispatch();

  const handleCancelRequest = () => {
    dispatch(cancelRequest(item.cancelTokenUid, item, collection));
  };

  return (
    <StyledWrapper className="mt-4 px-3 w-full">
      <div className="overlay">
        <div style={{marginBottom: 15, fontSize: 26}}>
          <div style={{display: 'inline-block', fontSize: 24, marginLeft: 5, marginRight: 5}}>
            <StopWatch/>
          </div>
        </div>
        <IconRefresh size={24} className="animate-spin"/>
        <button
          onClick={handleCancelRequest}
          className="mt-4 uppercase bg-gray-200 active:bg-blueGray-600 text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button"
        >
          Cancel Request
        </button>
      </div>
    </StyledWrapper>
  );
};

export default ResponseLoadingOverlay;
