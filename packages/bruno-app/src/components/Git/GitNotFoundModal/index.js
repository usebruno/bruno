import React from 'react';
import Modal from 'components/Modal/index';
import Portal from 'components/Portal/index';

const getOSName = () => {
  const platform = window.navigator.userAgentData?.platform;
  if (platform.startsWith('Win')) {
    return 'Windows';
  } else if (platform.startsWith('Mac')) {
    return 'macOS';
  } else if (platform.startsWith('Linux')) {
    return 'Linux';
  } else {
    return 'your OS';
  }
};

const getDownloadUrl = (os) => {
  switch (os) {
    case 'Windows':
      return 'https://git-scm.com/download/win';
    case 'macOS':
      return 'https://git-scm.com/download/mac';
    case 'Linux':
      return 'https://git-scm.com/download/linux';
    default:
      return 'https://git-scm.com/download';
  }
};

const GitNotFoundModal = ({ onClose }) => {
  const osName = getOSName();
  const downloadUrl = getDownloadUrl(osName);

  return (
    <Portal>
      <Modal
        size="sm"
        title="Git Not Found"
        handleCancel={onClose}
        hideFooter={true}
      >
        <div>
          <p>Git was not detected on your system. You need to install Git to proceed.</p>
          <p className="mt-2">
            You can download Git for <strong>{osName}</strong> here:
          </p>
          <p>
            <span
              className="text-blue-600 cursor-pointer border-b border-blue-600"
              onClick={() => window.open(downloadUrl, '_blank')}
            >
              Download Git for {osName}
            </span>
          </p>
        </div>
      </Modal>
    </Portal>
  );
};

export default GitNotFoundModal;
