import { useState } from 'react';
import { useTheme } from '../../../../providers/Theme';
import { useDispatch } from 'react-redux';
import { openCollection } from 'providers/ReduxStore/slices/collections/actions';

import toast from 'react-hot-toast';
import styled from 'styled-components';
import CreateCollection from 'components/Sidebar/CreateCollection';
import SshConnectionDialog from 'components/Sidebar/SshConnectionDialog';
import RemoteFileBrowser from 'components/Sidebar/RemoteFileBrowser';
import StyledWrapper from './StyledWrapper';

const LinkStyle = styled.span`
  color: ${(props) => props.theme['text-link']};
`;

const CreateOrOpenCollection = () => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [sshConnectionDialogOpen, setSshConnectionDialogOpen] = useState(false);
  const [remoteFileBrowserOpen, setRemoteFileBrowserOpen] = useState(false);
  const [currentConnectionId, setCurrentConnectionId] = useState(null);

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch(
      (err) => {
        console.log(err);
        toast.error('An error occurred while opening the collection');
      }
    );
  };

  const handleSshConnect = (connectionId, config) => {
    setCurrentConnectionId(connectionId);
    setRemoteFileBrowserOpen(true);
  };

  const handleSelectCollection = (result) => {
    console.log('Collection opened:', result);
    // Collection will be automatically opened via IPC events
  };

  const CreateLink = () => (
    <LinkStyle
      className="underline text-link cursor-pointer"
      theme={theme}
      onClick={() => setCreateCollectionModalOpen(true)}
    >
      Create
    </LinkStyle>
  );

  const OpenLink = () => (
    <LinkStyle className="underline text-link cursor-pointer" theme={theme} onClick={() => handleOpenCollection(true)}>
      Open
    </LinkStyle>
  );

  const OpenRemoteLink = () => (
    <LinkStyle
      className="underline text-link cursor-pointer"
      theme={theme}
      onClick={() => setSshConnectionDialogOpen(true)}
    >
      Open Remote
    </LinkStyle>
  );

  return (
    <StyledWrapper className="px-2 mt-4">
      {createCollectionModalOpen ? <CreateCollection onClose={() => setCreateCollectionModalOpen(false)} /> : null}
      {sshConnectionDialogOpen ? (
        <SshConnectionDialog
          isOpen={sshConnectionDialogOpen}
          onClose={() => setSshConnectionDialogOpen(false)}
          onConnect={handleSshConnect}
        />
      ) : null}
      {remoteFileBrowserOpen ? (
        <RemoteFileBrowser
          isOpen={remoteFileBrowserOpen}
          onClose={() => setRemoteFileBrowserOpen(false)}
          connectionId={currentConnectionId}
          onSelectCollection={handleSelectCollection}
        />
      ) : null}

      <div className="text-xs text-center">
        <div>No collections found.</div>
        <div className="mt-2">
          <CreateLink /> or <OpenLink /> Collection.
        </div>
        <div className="mt-1">
          Or <OpenRemoteLink /> via SSH.
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CreateOrOpenCollection;
