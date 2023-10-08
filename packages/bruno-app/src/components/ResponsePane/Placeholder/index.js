import React from 'react';
import { IconSend } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { isMacOS } from 'utils/common/platform';

const isMac = isMacOS();
const sendShortcut = isMac ? 'Cmd + Enter' : 'Ctrl + Enter';
const newShortcut = isMac ? 'Cmd + B' : 'Ctrl + B';
const editEnvShortcut = isMac ? 'Cmd + E' : 'Ctrl + E';

const Placeholder = () => {
  return (
    <StyledWrapper>
      <div className="send-icon flex justify-center" style={{ fontSize: 200 }}>
        <IconSend size={150} strokeWidth={1} />
      </div>
      <div className="flex mt-4">
        <div className="flex flex-1 flex-col items-end px-1">
          <div className="px-1 py-2">Send Request</div>
          <div className="px-1 py-2">New Request</div>
          <div className="px-1 py-2">Edit Environments</div>
        </div>
        <div className="flex flex-1 flex-col px-1">
          <div className="px-1 py-2">{sendShortcut}</div>
          <div className="px-1 py-2">{newShortcut}</div>
          <div className="px-1 py-2">{editEnvShortcut}</div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Placeholder;
