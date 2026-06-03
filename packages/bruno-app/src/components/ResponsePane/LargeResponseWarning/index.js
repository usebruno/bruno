import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconDownload, IconCopy, IconEye, IconAlertTriangle } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import { formatSize } from 'utils/common/index';
import Button from 'ui/Button/index';

const LargeResponseWarning = ({ item, responseSize, onRevealResponse }) => {
  const { t } = useTranslation();
  const { ipcRenderer } = window;
  const response = item.response || {};

  const downloadResponseToFile = () => {
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:save-response-to-file', response, item.requestSent.url, item.pathname)
        .then((result) => {
          if (result && result.success) {
            toast.success(t('RESPONSE_PANE.RESPONSE_DOWNLOADED_TO_FILE'));
          }
          resolve();
        })
        .catch((err) => {
          toast.error(get(err, 'error.message') || t('RESPONSE_PANE.SOMETHING_WENT_WRONG'));
          reject(err);
        });
    });
  };

  const copyResponse = () => {
    try {
      const textToCopy = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);

      navigator.clipboard.writeText(textToCopy).then(() => {
        toast.success(t('RESPONSE_PANE.RESPONSE_COPIED_TO_CLIPBOARD'));
      }).catch(() => {
        toast.error(t('RESPONSE_PANE.FAILED_TO_COPY_RESPONSE'));
      });
    } catch (error) {
      toast.error(t('RESPONSE_PANE.FAILED_TO_COPY_RESPONSE'));
    }
  };

  return (
    <StyledWrapper>
      <div className="warning-container">
        <div className="warning-icon">
          <IconAlertTriangle size={45} strokeWidth={2} />
        </div>
        <div className="warning-content">
          <div className="warning-title">
            {t('RESPONSE_PANE.LARGE_RESPONSE_WARNING')}
          </div>
          <div className="warning-description">
            {t('RESPONSE_PANE.LARGE_RESPONSE_DESC', { supportedSize: formatSize(10 * 1024 * 1024), currentSize: formatSize(responseSize) })}
          </div>
        </div>
      </div>
      <div className="warning-actions">
        <Button
          icon={<IconEye size={18} strokeWidth={1.5} />}
          iconPosition="left"
          onClick={onRevealResponse}
          title={t('RESPONSE_PANE.SHOW_RESPONSE_CONTENT')}
          color="secondary"
          size="sm"
        >
          {t('RESPONSE_PANE.VIEW')}
        </Button>
        <Button
          icon={<IconDownload size={18} strokeWidth={1.5} />}
          iconPosition="left"
          onClick={downloadResponseToFile}
          disabled={!response.dataBuffer}
          title={t('RESPONSE_PANE.DOWNLOAD_RESPONSE_TO_FILE')}
          color="secondary"
          size="sm"
        >
          {t('RESPONSE_PANE.DOWNLOAD')}
        </Button>
        <Button
          icon={<IconCopy size={18} strokeWidth={1.5} />}
          iconPosition="left"
          onClick={copyResponse}
          disabled={!response.data}
          title={t('RESPONSE_PANE.COPY_RESPONSE_TO_CLIPBOARD')}
          color="secondary"
          size="sm"
        >
          {t('RESPONSE_PANE.COPY')}
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default LargeResponseWarning;
