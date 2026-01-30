import React from 'react';
import Font from './Font/index';

const Display = ({ close }) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div>
        <div className="section-header">Display</div>
      </div>
      <div className="flex flex-col mb-2 gap-10 w-full">
        <div className="w-fit flex flex-col gap-2">
          <Font close={close} />
        </div>
      </div>
    </div>
  );
};

export default Display;
