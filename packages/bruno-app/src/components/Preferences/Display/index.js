import React from 'react';
import Font from './Font/index';
import Theme from './Theme/index';

const Display = ({ close }) => {
  return (
      <div className="flex flex-col my-2 gap-10 w-full">
        <div className='w-full flex flex-col gap-2'>
          <span>
            Theme
          </span>
          <Theme close={close} />
        </div>
        <div className='h-[1px] bg-[#aaa5] w-full'></div>
        <div className='w-fit flex flex-col gap-2'>
          <Font close={close} />
        </div>
      </div>
  );
};

export default Display;
