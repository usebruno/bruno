import { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { IconFileCode, IconPlus } from '@tabler/icons';

import { openApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import CreateApiSpec from 'components/Sidebar/ApiSpecs/CreateApiSpec';
import ApiSpecs from 'components/Sidebar/ApiSpecs';
import SidebarSection from 'components/Sidebar/SidebarSection';

const ApiSpecsSection = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [createApiSpecModalOpen, setCreateApiSpecModalOpen] = useState(false);

  const handleOpenApiSpec = () => {
    dispatch(openApiSpec()).catch((err) => {
      console.error(err);
      toast.error(t('SIDEBAR.ERROR_OPENING_API_SPEC'));
    });
  };

  const addDropdownItems = [
    {
      id: 'create-api-spec',
      leftSection: IconPlus,
      label: t('SIDEBAR.CREATE_API_SPEC'),
      onClick: () => {
        setCreateApiSpecModalOpen(true);
      }
    },
    {
      id: 'open-api-spec',
      leftSection: IconFileCode,
      label: t('SIDEBAR.OPEN_API_SPEC'),
      onClick: () => {
        handleOpenApiSpec();
      }
    }
  ];

  const sectionActions = (
    <>
      <MenuDropdown
        data-testid="api-specs-header-add-menu"
        items={addDropdownItems}
        placement="bottom-end"
      >
        <ActionIcon
          label={t('SIDEBAR.ADD_NEW_API_SPEC')}
        >
          <IconPlus size={14} stroke={1.5} aria-hidden="true" />
        </ActionIcon>
      </MenuDropdown>
    </>
  );

  return (
    <>
      {createApiSpecModalOpen && (
        <CreateApiSpec
          onClose={() => setCreateApiSpecModalOpen(false)}
        />
      )}
      <SidebarSection
        id="api-specs"
        title={t('SIDEBAR.API_SPECS')}
        icon={IconFileCode}
        actions={sectionActions}
        className="api-specs-section"
      >
        <ApiSpecs />
      </SidebarSection>
    </>
  );
};

export default ApiSpecsSection;
