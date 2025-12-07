import { setActiveApiSpecUid } from 'providers/ReduxStore/slices/apiSpec';
import { showApiSpecPage as _showApiSpecPage } from 'providers/ReduxStore/slices/app';
import Dropdown from 'components/Dropdown';
import { IconDots } from '@tabler/icons';
import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CloseApiSpec from '../CloseApiSpec/index';
import { forwardRef } from 'react';

const ApiSpecItem = ({ apiSpec }) => {
  const dispatch = useDispatch();

  const activeApiSpecUid = useSelector((state) => state.apiSpec.activeApiSpecUid);
  const showApiSpecPage = useSelector((state) => state.app.showApiSpecPage);

  const [closeApiSpecModal, setCloseApiSpecModal] = useState(false);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const handleOpenApiSpec = (apiSpec) => (e) => {
    dispatch(_showApiSpecPage());
    dispatch(setActiveApiSpecUid({ uid: apiSpec.uid }));
  };

  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref}>
        <IconDots size={22} />
      </div>
    );
  });

  return (
    <div
      className={`flex flex-grow api-spec-item items-center h-full overflow-hidden w-full justify-between ${
        showApiSpecPage && apiSpec?.uid == activeApiSpecUid ? 'active' : ''
      }`}
    >
      {closeApiSpecModal && <CloseApiSpec apiSpec={apiSpec} onClose={() => setCloseApiSpecModal(false)} />}
      <div
        className="cursor-pointer py-2 pl-4 h-8 flex items-center flex-grow w-[80%] justify-between"
        onClick={handleOpenApiSpec(apiSpec)}
      >
        <span className="flex-nowrap whitespace-nowrap overflow-ellipsis overflow-hidden w-full">{apiSpec?.name}</span>
      </div>
      <div className="menu-icon pr-2">
        <Dropdown onCreate={onDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
          <div
            className="dropdown-item close-item"
            onClick={(e) => {
              dropdownTippyRef.current.hide();
              setCloseApiSpecModal(true);
            }}
          >
            Close
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default ApiSpecItem;
