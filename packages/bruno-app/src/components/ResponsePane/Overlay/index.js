import React from 'react';
import { IconRefresh } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { cancelRequest } from 'providers/ReduxStore/slices/collections/actions';
import StopWatch from '../../StopWatch';
import StyledWrapper from './StyledWrapper';

const ResponseLoadingOverlay = ({ item, collection }) => {
  const dispatch = useDispatch();

  const handleCancelRequest = () => {
    dispatch(cancelRequest(item.cancelTokenUid, item, collection));
  };

  return (
    <StyledWrapper className="w-full">
      <div className="overlay">
        <div style={{ marginBottom: 15, fontSize: 26 }}>
          <div style={{ display: 'inline-block', fontSize: 20, marginLeft: 5, marginRight: 5 }}>
            <StopWatch startTime={item?.requestStartTime} />
          </div>
        </div>
        <IconRefresh size={24} className="loading-icon" />
        <button
          onClick={handleCancelRequest}
          className="mt-4 uppercase btn-sm rounded btn-secondary ease-linear transition-all duration-150 relative z-50"
          type="button"
        >
          Cancel Request
        </button>
      </div>
    </StyledWrapper>
  );
};

export default ResponseLoadingOverlay;
