import React from 'react';
import Font from './Font/index';
import Zoom from './Zoom/index';

const Display = ({ close }) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="section-header">Display</div>
      <div className="flex flex-col mb-2 gap-10 w-full">
        <div className="w-fit flex flex-col gap-2">
          <Font close={close} />
        </div>
        <div className="w-full flex flex-col gap-2">
          <Zoom />
        </div>
      </div>
    </div>
  );
};

export default Display;
