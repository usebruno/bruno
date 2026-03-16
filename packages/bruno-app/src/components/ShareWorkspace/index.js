import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { IconUpload, IconCode } from '@tabler/icons';
import Modal from 'components/Modal';
import StyledWrapper from 'components/ShareCollection/StyledWrapper';
import classnames from 'classnames';
import ExportWorkspace from './ExportWorkspace';
import EmbedWorkspace from './EmbedWorkspace';

const ShareWorkspace = ({ onClose, workspaceUid }) => {
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const workspace = workspaces.find((w) => w.uid === workspaceUid);
  const [tab, setTab] = useState('export');

  const handleTabSelect = (value) => (e) => setTab(value);

  const getTabClassname = (tabName) => {
    return classnames(`flex tab items-center py-2 px-4 ${tabName}`, {
      active: tabName === tab
    });
  };

  const renderTabContent = () => {
    switch (tab) {
      case 'export':
        return <ExportWorkspace workspace={workspace} onClose={onClose} />;
      case 'embed':
        return <EmbedWorkspace workspace={workspace} />;
      default:
        return null;
    }
  };

  if (!workspace) return null;

  return (
    <Modal size="md" title="Export Workspace" handleCancel={onClose} hideFooter>
      <StyledWrapper className="flex flex-col h-full w-full">
        <div className="flex w-full mb-6">
          <div className="inline-flex tabs">
            <div className={getTabClassname('export')} onClick={handleTabSelect('export')}>
              <IconUpload size={18} strokeWidth={1.5} className="mr-2" />
              Export
            </div>
            <div className={getTabClassname('embed')} onClick={handleTabSelect('embed')}>
              <IconCode size={18} strokeWidth={1.5} className="mr-2" />
              Embed
            </div>
          </div>
        </div>
        {renderTabContent()}
      </StyledWrapper>
    </Modal>
  );
};

export default ShareWorkspace;
