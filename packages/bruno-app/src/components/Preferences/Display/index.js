import React from 'react';
import Font from './Font/index';

const Display = ({ close }) => {
  return (
    <div className="flex flex-col my-2 gap-10 w-full">
      <div className="w-fit flex flex-col gap-2">
        <Font close={close} />
      </div>
    </div>
  );
};

export default Display;
