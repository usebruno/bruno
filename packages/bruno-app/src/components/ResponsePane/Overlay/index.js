import React from 'react';
import { IconRefresh } from '@tabler/icons';
import { useDispatch, useSelector } from 'react-redux';
import { cancelRequest } from 'providers/ReduxStore/slices/collections/actions';
import StopWatch from '../../StopWatch';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button/index';

const ResponseLoadingOverlay = ({ item, collection }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';

  const handleCancelRequest = () => {
    dispatch(cancelRequest(item.cancelTokenUid, item, collection));
  };

  return (
    <StyledWrapper className={`w-full ${isVerticalLayout ? 'vertical-layout' : ''}`}>
      <div className="overlay">
        <div style={{ marginBottom: 15, fontSize: 26 }}>
          <div style={{ display: 'inline-block', fontSize: 20, marginLeft: 5, marginRight: 5 }}>
            <StopWatch startTime={item?.requestStartTime} />
          </div>
        </div>
        <IconRefresh size={24} className="loading-icon" />
        <Button
          onClick={handleCancelRequest}
          className="mt-4"
        >
          Cancel Request
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default ResponseLoadingOverlay;
