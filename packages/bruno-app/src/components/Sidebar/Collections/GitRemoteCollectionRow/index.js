import React, { useRef, useState } from 'react';
import { IconBrandGit, IconCopy, IconDots, IconUnlink } from '@tabler/icons';
import toast from 'react-hot-toast';
import ActionIcon from 'ui/ActionIcon';
import MenuDropdown from 'ui/MenuDropdown';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import RemoveGitRemote from 'components/WorkspaceHome/WorkspaceOverview/CollectionsList/RemoveGitRemote';
import StyledWrapper from './StyledWrapper';

const GitRemoteCollectionRow = ({ entry }) => {
  const { dropdownContainerRef } = useSidebarAccordion();
  const menuDropdownRef = useRef(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showRemoveGitModal, setShowRemoveGitModal] = useState(false);

  const openCloneModal = () => setShowCloneModal(true);
  const closeCloneModal = () => setShowCloneModal(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(entry.remote);
      toast.success('Git URL copied');
    } catch (e) {
      toast.error('Failed to copy URL');
    }
  };

  const handleRightClick = (event) => {
    event.preventDefault();
    menuDropdownRef.current?.show();
  };

  const menuItems = [
    {
      id: 'clone-git',
      leftSection: IconBrandGit,
      label: 'Clone from Git',
      onClick: openCloneModal
    },
    {
      id: 'copy-url',
      leftSection: IconCopy,
      label: 'Copy Git URL',
      onClick: handleCopyUrl
    },
    {
      id: 'remove-git-remote',
      leftSection: IconUnlink,
      label: 'Remove Git Remote',
      onClick: () => setShowRemoveGitModal(true)
    }
  ];

  return (
    <StyledWrapper>
      {showCloneModal && (
        <CloneGitRepository
          onClose={closeCloneModal}
          onFinish={closeCloneModal}
          collectionRepositoryUrl={entry.remote}
        />
      )}
      {showRemoveGitModal && (
        <RemoveGitRemote
          collectionPath={entry.path}
          collectionName={entry.name}
          remoteUrl={entry.remote}
          onClose={() => setShowRemoveGitModal(false)}
        />
      )}
      <div
        className="git-collection-row"
        onClick={openCloneModal}
        onContextMenu={handleRightClick}
        title={`${entry.name} — click to clone from ${entry.remote}`}
        data-testid="sidebar-git-collection-row"
      >
        <div className="flex flex-grow items-center overflow-hidden">
          <span className="git-badge ml-1" aria-hidden="true">
            <IconBrandGit size={14} strokeWidth={2} />
          </span>
          <div className="git-collection-name w-full">{entry.name}</div>
        </div>
        <div>
          <div className="pr-2" onClick={(e) => e.stopPropagation()}>
            <MenuDropdown
              ref={menuDropdownRef}
              items={menuItems}
              placement="bottom-start"
              appendTo={dropdownContainerRef?.current || document.body}
              popperOptions={{ strategy: 'fixed' }}
            >
              <ActionIcon className="collection-actions">
                <IconDots size={18} />
              </ActionIcon>
            </MenuDropdown>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GitRemoteCollectionRow;
