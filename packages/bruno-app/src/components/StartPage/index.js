import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
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
import Bruno from 'components/Bruno';
import ToolHint from 'components/ToolHint';
import CreateTransientRequest from 'components/CreateTransientRequest';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';
import CreateGlobalEnvironment from 'components/WorkspaceHome/WorkspaceEnvironments/CreateEnvironment';
import CreateApiSpec from 'components/Sidebar/ApiSpecs/CreateApiSpec';
import CreateMockServerModal from 'components/MockServer/CreateMockServerModal';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { getWorkspaceTab } from 'utils/tabs';
import { setIsImportingCollection, setIsOpeningCollection } from 'providers/ReduxStore/slices/app';
import useCreateWorkspace from 'hooks/useCreateWorkspace';
import useCreateCollectionInWorkspace from 'hooks/useCreateCollectionInWorkspace';
import { useIsMockServerEnabled } from 'utils/mock-server/is-enabled';
import { PRESET_REQUEST_TYPES as REQUEST_TYPE } from 'utils/common/constants';
import useCreateTransientRequest from 'hooks/useCreateTransientRequest';
import StyledWrapper from './StyledWrapper';

const VALUE_POINTS = [
  { icon: IconFiles, title: 'Collections stored as files',
    text: 'Every request, folder and environment is a plain file on your computer, in an open format.' },

  { icon: IconGitBranch, title: 'Collaborate through Git',
    text: 'Branch, commit and review collections like code, with any Git provider your team already uses.' },

  { icon: IconLock, title: 'Private by design',
    text: 'No sign-up, no login, no cloud. Your collections and secrets live only where you keep them.' }
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
  const isMockServerEnabled = useIsMockServerEnabled();
  const { collection: scratchCollection, createRequest } = useCreateTransientRequest(scratchCollectionUid);
  const [showCloneGitModal, setShowCloneGitModal] = useState(false);
  const [showCreateEnvironmentModal, setShowCreateEnvironmentModal] = useState(false);
  const [showCreateApiSpecModal, setShowCreateApiSpecModal] = useState(false);
  const [showCreateMockServerModal, setShowCreateMockServerModal] = useState(false);
  const closeCloneGitModal = () => setShowCloneGitModal(false);

  const { createWorkspace, isCreateWorkspaceModalOpen, closeCreateWorkspaceModal } = useCreateWorkspace();
  const { createCollection } = useCreateCollectionInWorkspace(workspace);

  const openGlobalEnvironmentSettings = () => scratchCollectionUid && dispatch(addTab(getWorkspaceTab(scratchCollectionUid, 'workspaceEnvironments')));

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
      onClick: () => dispatch(addTab(getWorkspaceTab(scratchCollectionUid, 'workspaceOverview')))
    },
    { id: 'import', icon: IconDownload, label: 'Import collection', onClick: () => dispatch(setIsImportingCollection(true)) },
    { id: 'open', icon: IconFolder, label: 'Open collection folder', onClick: () => dispatch(setIsOpeningCollection(true)) },
    { id: 'clone', icon: IconGitBranch, label: 'Clone a Git repository', onClick: () => setShowCloneGitModal(true) }
  ].filter(Boolean);

  const renderCreateButton = ({ id, icon: Icon, label, onClick }) => (
    <ToolHint key={id} text={label} toolhintId={`start-page-new-${id}`} place="bottom" positionStrategy="fixed">
      <button type="button" className="create-button flex items-center justify-center w-8 h-8" aria-label={label} data-testid={`start-page-new-${id}`} onClick={onClick}>
        <Icon size={18} strokeWidth={1.5} />
      </button>
    </ToolHint>
  );

  return (
    <StyledWrapper className="h-full flex flex-col" data-testid="start-page">
      {showCloneGitModal && <CloneGitRepository onClose={closeCloneGitModal} onFinish={closeCloneGitModal} />}
      {isCreateWorkspaceModalOpen && <CreateWorkspace onClose={closeCreateWorkspaceModal} />}
      {showCreateEnvironmentModal && (
        <CreateGlobalEnvironment
          onClose={() => setShowCreateEnvironmentModal(false)}
          onEnvironmentCreated={openGlobalEnvironmentSettings}
        />
      )}
      {showCreateApiSpecModal && <CreateApiSpec onClose={() => setShowCreateApiSpecModal(false)} />}
      {showCreateMockServerModal && <CreateMockServerModal onClose={() => setShowCreateMockServerModal(false)} />}
      <div className="start-page-bar flex items-center shrink-0 h-7 pl-0.5">
        <CreateTransientRequest collectionUid={scratchCollectionUid} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto flex justify-center py-12 px-6">
        <div className="w-full max-w-[45.625rem] my-auto flex flex-col items-center text-center">
          <div className="flex flex-col items-center mb-9">
            <span className="flex" aria-hidden="true"><Bruno width={64} /></span>
            <div className="text-[1.75rem] font-semibold leading-[1.2]">Bruno</div>
            <div className="brand-tagline mt-1">The open source local-first, git-native, lightweight API client.</div>
          </div>

          <div className="w-full grid grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))] gap-3 mb-9 text-left">
            {VALUE_POINTS.map(({ icon: Icon, title, text }) => (
              <div className="value-point py-3.5 px-4" key={title}>
                <div className="value-point-title flex items-center gap-2 font-semibold mb-1.5">
                  <Icon size={16} strokeWidth={1.75} />
                  {title}
                </div>
                <div className="value-point-text leading-normal">{text}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-x-20 gap-y-8 text-left">
            <div>
              <div className="section-title mb-2.5">Start</div>
              {startLinks.map(({ id, icon: Icon, label, onClick }) => (
                <button type="button" className="link flex items-center gap-2 py-[0.3125rem]" key={id} data-testid={`start-page-${id}`} onClick={onClick}>
                  <Icon size={16} strokeWidth={1.5} />
                  {label}
                </button>
              ))}
            </div>
            <div>
              <div className="section-title mb-2.5">Help</div>
              {HELP_LINKS.map(({ id, icon: Icon, label, url }) => (
                <button
                  type="button"
                  className="link flex items-center gap-2 py-[0.3125rem]"
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

          <div className="section-title mt-8 mb-2.5">Or create new</div>
          <div className="flex flex-wrap justify-center gap-1">
            {requestItems.map(renderCreateButton)}
            {requestItems.length > 0 && <span className="create-divider self-center w-px h-[1.125rem] mx-1.5" aria-hidden="true" />}
            {createItems.map(renderCreateButton)}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default StartPage;
