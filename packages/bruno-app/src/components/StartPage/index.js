import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconFiles,
  IconGitBranch,
  IconLock,
  IconBook,
  IconArrowsExchange,
  IconBrandGithub,
  IconBrandDiscord,
  IconHome,
  IconDownload,
  IconFolder,
  IconCategory,
  IconBox,
  IconWorld,
  IconFileCode,
  IconServer2,
  IconApi,
  IconBrandGraphql,
  IconCode,
  IconPlugConnected
} from '@tabler/icons';
import toast from 'react-hot-toast';
import Bruno from 'components/Bruno';
import ToolHint from 'components/ToolHint';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';
import CreateGlobalEnvironment from 'components/WorkspaceHome/WorkspaceEnvironments/CreateEnvironment';
import CreateApiSpec from 'components/Sidebar/ApiSpecs/CreateApiSpec';
import CreateMockServerModal from 'components/MockServer/CreateMockServerModal';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { setIsCreatingCollection, setIsImportingCollection, setIsOpeningCollection, toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import { createWorkspaceWithUniqueName } from 'providers/ReduxStore/slices/workspaces/actions';
import { setLocalStorageValue, SIDEBAR_COLLAPSED_KEY } from 'utils/common/localStorage';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import { PRESET_REQUEST_TYPES as REQUEST_TYPE } from 'utils/common/constants';
import useCreateTransientRequest from 'hooks/useCreateTransientRequest';
import StyledWrapper from './StyledWrapper';

const VALUE_POINTS = [
  { icon: IconFiles, title: 'Collections stored as files',
    text: 'Every request, folder and environment is a file on your disk, in an open format.' },

  { icon: IconGitBranch, title: 'Collaborate through Git',
    text: 'Branch, commit and review collections like code, with any Git provider your team already uses.' },

  { icon: IconLock, title: 'Private by default',
    text: 'No sign-up, no login, no cloud sync. Your collections and secrets never go to our servers.' }
];

const HELP_LINKS = [
  { id: 'docs',
    icon: IconBook,
    label: 'Documentation',
    url: 'https://docs.usebruno.com' },

  { id: 'switching',
    icon: IconArrowsExchange,
    label: 'Switching from other tools',
    url: 'https://docs.usebruno.com/get-started/import-export-data/import-collections' },

  { id: 'github',
    icon: IconBrandGithub,
    label: 'Ask on GitHub Discussions',
    url: 'https://github.com/usebruno/bruno/discussions' },

  { id: 'discord',
    icon: IconBrandDiscord,
    label: 'Ask the community on Discord',
    url: 'https://discord.com/invite/KgcZUncpjq' }
];

const StartPage = ({ workspace }) => {
  const dispatch = useDispatch();
  const { scratchCollectionUid } = workspace;
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const isCreatingCollection = useSelector((state) => state.app.isCreatingCollection);
  const defaultLocation = useSelector((state) => state.app.preferences?.general?.defaultLocation || '');
  const isMockServerEnabled = useBetaFeature(BETA_FEATURES.MOCK_SERVER);
  const { collection: scratchCollection, createRequest } = useCreateTransientRequest(scratchCollectionUid);
  const [showCloneGitModal, setShowCloneGitModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showCreateEnvironmentModal, setShowCreateEnvironmentModal] = useState(false);
  const [showCreateApiSpecModal, setShowCreateApiSpecModal] = useState(false);
  const [showCreateMockServerModal, setShowCreateMockServerModal] = useState(false);
  const closeCloneGitModal = () => setShowCloneGitModal(false);

  const createWorkspace = () => {
    if (!defaultLocation) {
      setShowCreateWorkspaceModal(true);
      return;
    }
    dispatch(createWorkspaceWithUniqueName(defaultLocation))
      .catch((error) => toast.error(error?.message || 'Failed to create workspace'));
  };

  const createCollection = async () => {
    if (isCreatingCollection) {
      return;
    }
    if (!workspace.pathname) {
      toast.error('Workspace path not found');
      return;
    }

    try {
      await window.ipcRenderer.invoke('renderer:ensure-collections-folder', workspace.pathname);
      if (sidebarCollapsed) {
        dispatch(toggleSidebarCollapse());
        setLocalStorageValue(SIDEBAR_COLLAPSED_KEY, false);
      }
      dispatch(setIsCreatingCollection(true));
    } catch (error) {
      toast.error('Error preparing workspace for collection creation');
    }
  };

  const openGlobalEnvironmentSettings = () => scratchCollectionUid && dispatch(addTab({
    uid: `${scratchCollectionUid}-environments`,
    collectionUid: scratchCollectionUid,
    type: 'workspaceEnvironments'
  }));

  const requestItems = scratchCollection
    ? [
        { id: 'http', icon: IconApi, label: 'New HTTP request', onClick: () => createRequest(REQUEST_TYPE.HTTP) },
        { id: 'graphql', icon: IconBrandGraphql, label: 'New GraphQL request', onClick: () => createRequest(REQUEST_TYPE.GRAPHQL) },
        { id: 'grpc', icon: IconCode, label: 'New gRPC request', onClick: () => createRequest(REQUEST_TYPE.GRPC) },
        { id: 'ws', icon: IconPlugConnected, label: 'New WebSocket request', onClick: () => createRequest(REQUEST_TYPE.WS) }
      ]
    : [];

  const createItems = [
    { id: 'workspace', icon: IconCategory, label: 'New workspace', onClick: createWorkspace },
    { id: 'collection', icon: IconBox, label: 'New collection', onClick: createCollection },
    { id: 'environment', icon: IconWorld, label: 'New global environment', onClick: () => setShowCreateEnvironmentModal(true) },
    { id: 'api-spec', icon: IconFileCode, label: 'New API spec', onClick: () => setShowCreateApiSpecModal(true) },
    ...(isMockServerEnabled
      ? [{ id: 'mock-server', icon: IconServer2, label: 'New mock server', onClick: () => setShowCreateMockServerModal(true) }]
      : [])
  ];

  const startLinks = [
    scratchCollectionUid && {
      id: 'overview',
      icon: IconHome,
      label: 'Open workspace overview',
      onClick: () => dispatch(addTab({
        uid: `${scratchCollectionUid}-overview`,
        collectionUid: scratchCollectionUid,
        type: 'workspaceOverview'
      }))
    },
    { id: 'import', icon: IconDownload, label: 'Import collection', onClick: () => dispatch(setIsImportingCollection(true)) },
    { id: 'open', icon: IconFolder, label: 'Open collection folder', onClick: () => dispatch(setIsOpeningCollection(true)) },
    { id: 'clone', icon: IconGitBranch, label: 'Clone a Git repository', onClick: () => setShowCloneGitModal(true) }
  ].filter(Boolean);

  const renderCreateButton = ({ id, icon: Icon, label, onClick }) => (
    <ToolHint key={id} text={label} toolhintId={`start-page-new-${id}`} place="bottom">
      <button type="button" className="create-button" aria-label={label} data-testid={`start-page-new-${id}`} onClick={onClick}>
        <Icon size={18} strokeWidth={1.5} />
      </button>
    </ToolHint>
  );

  return (
    <StyledWrapper data-testid="start-page">
      {showCloneGitModal && <CloneGitRepository onClose={closeCloneGitModal} onFinish={closeCloneGitModal} />}
      {showCreateWorkspaceModal && <CreateWorkspace onClose={() => setShowCreateWorkspaceModal(false)} />}
      {showCreateEnvironmentModal && (
        <CreateGlobalEnvironment
          onClose={() => setShowCreateEnvironmentModal(false)}
          onEnvironmentCreated={openGlobalEnvironmentSettings}
        />
      )}
      {showCreateApiSpecModal && <CreateApiSpec onClose={() => setShowCreateApiSpecModal(false)} />}
      {showCreateMockServerModal && <CreateMockServerModal onClose={() => setShowCreateMockServerModal(false)} />}
      <div className="start-page">
        <Bruno width={64} />
        <div className="brand-title">Bruno</div>
        <div className="brand-tagline">The open source local-first, git-native, lightweight API client.</div>

        <div className="value-points">
          {VALUE_POINTS.map(({ icon: Icon, title, text }) => (
            <div className="value-point" key={title}>
              <div className="value-point-title">
                <Icon size={16} strokeWidth={1.75} />
                {title}
              </div>
              <div className="value-point-text">{text}</div>
            </div>
          ))}
        </div>

        <div className="columns">
          <div>
            <div className="section-title">Start</div>
            {startLinks.map(({ id, icon: Icon, label, onClick }) => (
              <button type="button" className="link" key={id} data-testid={`start-page-${id}`} onClick={onClick}>
                <Icon size={16} strokeWidth={1.5} />
                {label}
              </button>
            ))}
          </div>
          <div>
            <div className="section-title">Help</div>
            {HELP_LINKS.map(({ id, icon: Icon, label, url }) => (
              <button
                type="button"
                className="link"
                key={id}
                data-testid={`start-page-${id}`}
                onClick={() => window.ipcRenderer.openExternal(url)}
              >
                <Icon size={16} strokeWidth={1.5} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="section-title create-title">Or create new</div>
        <div className="create-row">
          {requestItems.map(renderCreateButton)}
          {requestItems.length > 0 && <span className="create-divider" aria-hidden="true" />}
          {createItems.map(renderCreateButton)}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default StartPage;
