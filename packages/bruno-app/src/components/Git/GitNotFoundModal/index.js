import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from 'components/Modal/index';
import Portal from 'components/Portal/index';

const getOSName = () => {
  const platform = window.navigator.userAgentData?.platform || '';
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
  const { t } = useTranslation();
  const osName = getOSName();
  const downloadUrl = getDownloadUrl(osName);

  return (
    <Portal>
      <Modal
        size="sm"
        title={t('SIDEBAR.GIT_NOT_FOUND')}
        handleCancel={onClose}
        hideFooter={true}
      >
        <div>
          <p>{t('SIDEBAR.GIT_NOT_DETECTED')}</p>
          <p className="mt-2">
            {t('SIDEBAR.GIT_DOWNLOAD_FOR', { os: osName })}
          </p>
          <p>
            <span
              className="text-blue-600 cursor-pointer border-b border-blue-600"
              onClick={() => window.open(downloadUrl, '_blank')}
            >
              {t('SIDEBAR.GIT_DOWNLOAD_FOR', { os: osName })}
            </span>
          </p>
        </div>
      </Modal>
    </Portal>
  );
};

export default GitNotFoundModal;
