import { setActiveApiSpecUid } from 'providers/ReduxStore/slices/apiSpec';
import { showApiSpecPage as _showApiSpecPage } from 'providers/ReduxStore/slices/app';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import { IconDots, IconX } from '@tabler/icons';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CloseApiSpec from '../CloseApiSpec/index';

const ApiSpecItem = ({ apiSpec }) => {
  const dispatch = useDispatch();
  const { dropdownContainerRef } = useSidebarAccordion();

  const activeApiSpecUid = useSelector((state) => state.apiSpec.activeApiSpecUid);
  const showApiSpecPage = useSelector((state) => state.app.showApiSpecPage);

  const [closeApiSpecModal, setCloseApiSpecModal] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  const handleOpenApiSpec = (apiSpec) => (e) => {
    dispatch(_showApiSpecPage());
    dispatch(setActiveApiSpecUid({ uid: apiSpec.uid }));
  };

  const menuItems = [
    {
      id: 'remove',
      leftSection: IconX,
      label: 'Remove',
      onClick: () => setCloseApiSpecModal(true)
    }
  ];

  const isActive = showApiSpecPage && apiSpec?.uid == activeApiSpecUid;

  return (
    <div
      className={`flex flex-grow api-spec-item items-center h-full overflow-hidden w-full justify-between ${
        isActive && !isKeyboardFocused ? 'active' : ''
      } ${isKeyboardFocused ? 'api-spec-keyboard-focused' : ''}`}
      tabIndex={0}
      onFocus={() => setIsKeyboardFocused(true)}
      onBlur={() => setIsKeyboardFocused(false)}
    >
      {closeApiSpecModal && <CloseApiSpec apiSpec={apiSpec} onClose={() => setCloseApiSpecModal(false)} />}
      <div
        className="cursor-pointer flex items-center flex-grow w-[80%] justify-between"
        onClick={handleOpenApiSpec(apiSpec)}
      >
        <span className="flex-nowrap whitespace-nowrap overflow-ellipsis overflow-hidden w-full">{apiSpec?.name}</span>
      </div>
      <div className="pr-2">
        <MenuDropdown
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
  );
};

export default ApiSpecItem;
