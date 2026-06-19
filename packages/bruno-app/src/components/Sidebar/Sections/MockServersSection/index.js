import { useState } from 'react';
import { IconPlus, IconServer } from '@tabler/icons';
import SidebarSection from 'components/Sidebar/SidebarSection';
import MockServers from 'components/Sidebar/MockServers';
import CreateMockServerModal from 'components/MockServer/CreateMockServerModal';
import ActionIcon from 'ui/ActionIcon';

const MockServersSection = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const sectionActions = (
    <ActionIcon
      label="Create mock server"
      onClick={() => setCreateModalOpen(true)}
      data-testid="mock-servers-create-btn"
    >
      <IconPlus size={14} stroke={1.5} aria-hidden="true" />
    </ActionIcon>
  );

  return (
    <>
      {createModalOpen && (
        <CreateMockServerModal onClose={() => setCreateModalOpen(false)} />
      )}
      <SidebarSection
        id="mock-servers"
        title="Mock Servers"
        icon={IconServer}
        actions={sectionActions}
        className="mock-servers-section"
      >
        <MockServers />
      </SidebarSection>
    </>
  );
};

export default MockServersSection;
