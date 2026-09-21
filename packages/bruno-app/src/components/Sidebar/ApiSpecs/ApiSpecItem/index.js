import { openApiSpecTab } from 'providers/ReduxStore/slices/apiSpec';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import { isApiSpecTabForPathname } from 'utils/api-specs';
import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { IconDots } from '@tabler/icons';
import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import CreateMockServerModal from 'components/MockServer/CreateMockServerModal';
import RemoveApiSpec from 'components/Sidebar/ApiSpecs/RemoveApiSpec';
import RenameApiSpec from 'components/Sidebar/ApiSpecs/RenameApiSpec';
import CloneApiSpec from 'components/Sidebar/ApiSpecs/CloneApiSpec';
import DeleteApiSpec from 'components/Sidebar/ApiSpecs/DeleteApiSpec';
import GenerateCollectionFromSpec from 'components/Sidebar/ApiSpecs/GenerateCollectionFromSpec';
import { buildMenuItems } from './buildMenuItems';

const ApiSpecItem = ({ apiSpec }) => {
  const dispatch = useDispatch();
  const { dropdownContainerRef } = useSidebarAccordion();
  const isMockServerEnabled = useBetaFeature(BETA_FEATURES.MOCK_SERVER);
  const menuDropdownRef = useRef(null);

  const isActive = useSelector((state) => {
    const activeTab = state.tabs.tabs.find((tab) => tab.uid === state.tabs.activeTabUid);
    return isApiSpecTabForPathname(activeTab, apiSpec?.pathname);
  });

  const [removeApiSpecModal, setRemoveApiSpecModal] = useState(false);
  const [generateCollectionModal, setGenerateCollectionModal] = useState(false);
  const [mockServerModal, setMockServerModal] = useState(false);
  const [renameApiSpecModal, setRenameApiSpecModal] = useState(false);
  const [cloneApiSpecModal, setCloneApiSpecModal] = useState(false);
  const [deleteApiSpecModal, setDeleteApiSpecModal] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  const openApiSpec = () => {
    dispatch(openApiSpecTab(apiSpec));
  };

  const handleRowKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openApiSpec();
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    menuDropdownRef.current?.toggle();
  };

  const handleReveal = () => {
    dispatch(showInFolder(apiSpec.pathname)).catch((error) => {
      console.error('Error revealing the API spec', error);
      toast.error('Error revealing the API spec');
    });
  };

  const handleGenerateCollection = () => {
    if (!isOpenApiSpec(apiSpec.resolvedJson || apiSpec.json)) {
      toast.error('This file is not a valid OpenAPI 3.x or Swagger 2.0 document');
      return;
    }
    setGenerateCollectionModal(true);
  };

  const menuItems = buildMenuItems({
    isMockServerEnabled,
    onGenerateCollection: handleGenerateCollection,
    onGenerateMockServer: () => setMockServerModal(true),
    onClone: () => setCloneApiSpecModal(true),
    onRename: () => setRenameApiSpecModal(true),
    onReveal: handleReveal,
    onRemove: () => setRemoveApiSpecModal(true),
    onDelete: () => setDeleteApiSpecModal(true)
  });

  return (
    <>
      {removeApiSpecModal && <RemoveApiSpec apiSpec={apiSpec} onClose={() => setRemoveApiSpecModal(false)} />}
      {renameApiSpecModal && <RenameApiSpec apiSpec={apiSpec} onClose={() => setRenameApiSpecModal(false)} />}
      {cloneApiSpecModal && <CloneApiSpec apiSpec={apiSpec} onClose={() => setCloneApiSpecModal(false)} />}
      {deleteApiSpecModal && <DeleteApiSpec apiSpec={apiSpec} onClose={() => setDeleteApiSpecModal(false)} />}
      {generateCollectionModal && (
        <GenerateCollectionFromSpec apiSpec={apiSpec} onClose={() => setGenerateCollectionModal(false)} />
      )}
      {mockServerModal && isMockServerEnabled && (
        <CreateMockServerModal
          defaultSourceType="spec"
          defaultApiSpecUid={apiSpec.uid}
          onClose={() => setMockServerModal(false)}
        />
      )}
      <div
        className={`flex flex-grow api-spec-item items-center overflow-hidden w-full justify-between ${
          isActive && !isKeyboardFocused ? 'active' : ''
        } ${isKeyboardFocused ? 'api-spec-keyboard-focused' : ''}`}
        tabIndex={0}
        data-testid="sidebar-api-spec-row"
        data-selected={isActive ? 'true' : undefined}
        onFocus={() => setIsKeyboardFocused(true)}
        onBlur={() => setIsKeyboardFocused(false)}
        onKeyDown={handleRowKeyDown}
        onContextMenu={handleRightClick}
      >
        <div
          className="cursor-pointer flex items-center flex-grow w-[80%] pl-3 justify-between"
          onClick={openApiSpec}
        >
          <span className="flex-nowrap whitespace-nowrap overflow-ellipsis overflow-hidden w-full">
            {apiSpec?.name}
          </span>
        </div>
        <div className="pr-2">
          <MenuDropdown
            ref={menuDropdownRef}
            items={menuItems}
            placement="bottom-start"
            appendTo={dropdownContainerRef?.current || document.body}
            popperOptions={{ strategy: 'fixed' }}
            data-testid="api-spec-actions"
          >
            <ActionIcon className="apispec-row-actions">
              <IconDots size={18} />
            </ActionIcon>
          </MenuDropdown>
        </div>
      </div>
    </>
  );
};

export default ApiSpecItem;
