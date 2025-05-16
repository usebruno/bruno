import React from 'react';
import { IconCircleOff } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const SkippedRequest = () => {
  return (
    <StyledWrapper>
      <div className="send-icon flex justify-center" style={{ fontSize: 200 }}>
        <IconCircleOff size={150} strokeWidth={1} />
      </div>
      <div className="flex mt-4 justify-center" style={{ fontSize: 25 }}>
        Request skipped
      </div>
    </StyledWrapper>
  );
};

export default SkippedRequest;