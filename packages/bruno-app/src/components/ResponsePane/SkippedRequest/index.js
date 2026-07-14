import React from 'react';
import { IconCircleOff } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const SkippedRequest = ({ reason }) => {
  return (
    <StyledWrapper data-testid="skipped-request">
      <div className="send-icon flex justify-center" style={{ fontSize: 200 }}>
        <IconCircleOff size={150} strokeWidth={1} />
      </div>
      <div className="flex mt-4 justify-center" style={{ fontSize: 25 }}>
        Request skipped
      </div>
      {reason && <div className="flex mt-2 justify-center text-center opacity-70">{reason}</div>}
    </StyledWrapper>
  );
};

export default SkippedRequest;
