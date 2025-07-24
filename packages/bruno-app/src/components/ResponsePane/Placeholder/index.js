import React from 'react';
import { IconSend } from '@tabler/icons';
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { isMacOS } from 'utils/common/platform';

const Placeholder = () => {
  const isMac = isMacOS();
  const sendRequestShortcut = isMac ? 'Cmd + Enter' : 'Ctrl + Enter';
  const newRequestShortcut = isMac ? 'Cmd + B' : 'Ctrl + B';
  const editEnvironmentShortcut = isMac ? 'Cmd + E' : 'Ctrl + E';
  const preferences = useSelector((state) => state.app.preferences);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';
  const globalSearchShortcut = isMac ? 'Cmd + K' : 'Ctrl + K';

  return (
    <StyledWrapper className={`${isVerticalLayout ? 'vertical-layout' : ''}`}>
      <div className="send-icon flex justify-center" style={{ fontSize: 200 }}>
        <IconSend size={150} strokeWidth={1} />
      </div>
      <div className="flex mt-4">
        <div className="flex flex-1 flex-col items-end px-1">
          <div className="px-1 py-2">Send Request</div>
          <div className="px-1 py-2">New Request</div>
          <div className="px-1 py-2">Edit Environments</div>
          <div className="px-1 py-2">Global Search</div>
        </div>
        <div className="flex flex-1 flex-col px-1">
          <div className="px-1 py-2">{sendRequestShortcut}</div>
          <div className="px-1 py-2">{newRequestShortcut}</div>
          <div className="px-1 py-2">{editEnvironmentShortcut}</div>
          <div className="px-1 py-2">{globalSearchShortcut}</div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Placeholder;
