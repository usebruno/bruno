import React from 'react';
import Font from './Font/index';
import RequestTabOrder from './RequestTabOrder/index';

const Display = ({ close }) => {
  return (
    <div className="flex flex-col my-2 gap-10 w-full">
      <div className="w-fit flex flex-col gap-2">
        <Font close={close} />
      </div>
      <div className="w-fit flex flex-col gap-2">
        <RequestTabOrder />
      </div>
    </div>
  );
};

export default Display;
