import React from 'react';
import Font from './Font/index';
import Zoom from './Zoom/index';
import StyledWrapper from './StyledWrapper';

const Display = ({ close }) => {
  return (
    <StyledWrapper className="flex flex-col gap-4 w-full">
      <div className="section-header">Display</div>
      <div className="settings-groups mb-2">
        <div className="settings-group">
          <div className="settings-group-title">Font Family</div>
          <Font close={close} />
        </div>
        <div className="settings-group">
          <div className="settings-group-title">Zoom Level</div>
          <div className="settings-row">
            <Zoom />
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Display;
