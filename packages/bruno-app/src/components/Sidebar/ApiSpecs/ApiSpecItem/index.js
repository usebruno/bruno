import { setActiveApiSpecUid } from 'providers/ReduxStore/slices/apiSpec';
import { showApiSpecPage as _showApiSpecPage } from 'providers/ReduxStore/slices/app';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import { IconDots, IconX } from '@tabler/icons';
import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CloseApiSpec from '../CloseApiSpec/index';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';

const ApiSpecItem = ({ apiSpec }) => {
  const dispatch = useDispatch();
  const { dropdownContainerRef } = useSidebarAccordion();

  const activeApiSpecUid = useSelector((state) => state.apiSpec.activeApiSpecUid);
  const showApiSpecPage = useSelector((state) => state.app.showApiSpecPage);

  const [closeApiSpecModal, setCloseApiSpecModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDropdownRef = useRef(null);

  const handleOpenApiSpec = (apiSpec) => (e) => {
    dispatch(_showApiSpecPage());
    dispatch(setActiveApiSpecUid({ uid: apiSpec.uid }));
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    menuDropdownRef.current?.show();
  };

  const menuItems = [
    {
      id: 'remove',
      leftSection: IconX,
      label: 'Remove',
      className: 'delete-item',
      onClick: () => setCloseApiSpecModal(true)
    }
  ];

  return (
    <div
      className={`flex flex-grow api-spec-item items-center h-full overflow-hidden w-full justify-between ${
        showApiSpecPage && apiSpec?.uid == activeApiSpecUid ? 'active' : ''
      } ${menuOpen ? 'menu-open' : ''}`}
      onContextMenu={handleContextMenu}
    >
      {closeApiSpecModal && <CloseApiSpec apiSpec={apiSpec} onClose={() => setCloseApiSpecModal(false)} />}
      <div
        className="cursor-pointer py-2 pl-4 h-8 flex items-center flex-grow w-[80%] justify-between"
        onClick={handleOpenApiSpec(apiSpec)}
      >
        <span className="flex-nowrap whitespace-nowrap overflow-ellipsis overflow-hidden w-full">{apiSpec?.name}</span>
      </div>
      <div className="pr-2">
        <MenuDropdown
          ref={menuDropdownRef}
          items={menuItems}
          opened={menuOpen}
          onChange={setMenuOpen}
          placement="bottom-start"
          data-testid="api-spec-item-menu"
          popperOptions={{ strategy: 'fixed' }}
          appendTo={dropdownContainerRef?.current || document.body}
        >
          <ActionIcon className="menu-icon">
            <IconDots size={18} className="api-spec-item-menu-icon" />
          </ActionIcon>
        </MenuDropdown>
      </div>
    </div>
  );
};

export default ApiSpecItem;
