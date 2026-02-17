import React, { useState } from 'react';
import { IconFileImport, IconBrandGit, IconUnlink, IconX } from '@tabler/icons';
import Modal from 'components/Modal';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import FileTab from './FileTab';
import GitHubTab from './GitHubTab';
import UrlTab from './UrlTab';
import FullscreenLoader from './FullscreenLoader/index';
import { useTheme } from 'providers/Theme';

const IMPORT_TABS = {
  FILE: 'file',
  GITHUB: 'github',
  URL: 'url'
};

const ImportCollection = ({ onClose, handleSubmit }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tab, setTab] = useState(IMPORT_TABS.FILE);

  const handleTabSelect = (value) => () => {
    setTab(value);
    setErrorMessage('');
  };

  const getTabClassname = (tabName) => {
    return classnames(`flex tab items-center py-2 px-4 ${tabName}`, {
      active: tabName === tab
    });
  };

  if (isLoading) {
    return <FullscreenLoader isLoading={isLoading} />;
  }

  return (
    <Modal size="md" title="Import Collection" hideFooter={true} handleCancel={onClose} dataTestId="import-collection-modal">
      <StyledWrapper className="flex flex-col h-full w-[600px] max-w-[600px]">
        <div className="flex w-full mb-6">
          <div className="flex justify-start w-full tabs">
            <div
              className={getTabClassname(IMPORT_TABS.FILE)}
              onClick={handleTabSelect(IMPORT_TABS.FILE)}
              data-testid="file-tab"
            >
              <IconFileImport size={18} strokeWidth={1.5} className="mr-2" />
              File
            </div>
            <div
              className={getTabClassname(IMPORT_TABS.GITHUB)}
              onClick={handleTabSelect(IMPORT_TABS.GITHUB)}
              data-testid="github-tab"
            >
              <IconBrandGit size={18} strokeWidth={1.5} className="mr-2" />
              Git Repository
            </div>
            <div
              className={getTabClassname(IMPORT_TABS.URL)}
              onClick={handleTabSelect(IMPORT_TABS.URL)}
              data-testid="url-tab"
            >
              <IconUnlink size={18} strokeWidth={1.5} className="mr-2" />
              URL
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            className="mb-4 p-2 border rounded-md"
            style={{
              backgroundColor: theme.status.danger.background,
              borderColor: theme.status.danger.border
            }}
          >
            <div className="flex gap-2">
              <div
                className="text-xs flex-1"
                style={{ color: theme.status.danger.text }}
              >
                {errorMessage}
              </div>
              <div
                className="close-button flex items-center cursor-pointer"
                onClick={() => setErrorMessage('')}
                style={{ color: theme.status.danger.text }}
              >
                <IconX size={16} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )}

        {tab === IMPORT_TABS.FILE && (
          <FileTab
            setIsLoading={setIsLoading}
            handleSubmit={handleSubmit}
            setErrorMessage={setErrorMessage}
          />
        )}
        {tab === IMPORT_TABS.GITHUB && (
          <GitHubTab
            handleSubmit={handleSubmit}
            setErrorMessage={setErrorMessage}
          />
        )}
        {tab === IMPORT_TABS.URL && (
          <UrlTab
            setIsLoading={setIsLoading}
            handleSubmit={handleSubmit}
            setErrorMessage={setErrorMessage}
          />
        )}
      </StyledWrapper>
    </Modal>
  );
};

export default ImportCollection;
