import React, { useState, useCallback } from 'react';
import { IconAlertTriangle, IconCopy, IconCheck, IconBrandGithub } from '@tabler/icons';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const GITHUB_ISSUES_URL = 'https://github.com/usebruno/bruno/issues/new';

const ImportErrorModal = ({ title = 'Import Failed', error, onClose }) => {
  const [copied, setCopied] = useState(false);

  const errorMessage = error?.message || 'An unknown error occurred during import.';
  const rawError = error?.rawError || null;

  const copyErrorToClipboard = useCallback(() => {
    navigator.clipboard.writeText(rawError || errorMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [errorMessage, rawError]);

  const reportOnGithub = useCallback(() => {
    const body = [
      '### Description',
      'Postman collection import failed with the following error:',
      '',
      '### Error Details',
      '```',
      rawError || errorMessage,
      '```',
      '',
      '### Additional Context',
      '<!-- Attach your Postman collection JSON (with sensitive data redacted) if possible -->'
    ].join('\n');

    const params = new URLSearchParams({
      title: `Postman import failure: ${errorMessage.slice(0, 80)}`,
      body,
      labels: 'bug'
    });

    window.open(`${GITHUB_ISSUES_URL}?${params.toString()}`, '_blank');
  }, [errorMessage, rawError]);

  return (
    <StyledWrapper>
      <Portal>
        <Modal
          size="md"
          title={title}
          hideFooter={true}
          handleCancel={onClose}
          dataTestId="import-error-modal"
        >
          <div className="import-error-content">
            <div className="error-banner">
              <IconAlertTriangle size={20} className="error-icon" />
              <div className="error-message">{errorMessage}</div>
            </div>

            {rawError && (
              <div className="error-raw">
                <pre>{rawError}</pre>
              </div>
            )}

            <p className="error-hint">
              Ensure your Postman collection is valid JSON and uses a supported schema (v2.0 or v2.1).
            </p>

            <div className="error-actions">
              <button className="action-button" onClick={reportOnGithub}>
                <IconBrandGithub size={14} />
                <span>Report on GitHub</span>
              </button>
              <button className="action-button" onClick={copyErrorToClipboard}>
                {copied ? (
                  <>
                    <IconCheck size={14} />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={14} />
                    <span>Copy Error</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </Portal>
    </StyledWrapper>
  );
};

export default ImportErrorModal;
