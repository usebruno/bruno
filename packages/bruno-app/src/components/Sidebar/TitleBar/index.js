import toast from 'react-hot-toast';
import Bruno from 'components/Bruno';
import Dropdown from 'components/Dropdown';
import CreateCollection from '../CreateCollection';
import importCollection from 'utils/collections/import';
import SelectCollection from 'components/Sidebar/Collections/SelectCollection';

import { IconDots } from '@tabler/icons';
import { IconFolders } from '@tabler/icons';
import { isElectron } from 'utils/common/platform';
import { useState, forwardRef, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import { collectionImported } from 'providers/ReduxStore/slices/collections';
import { openLocalCollection } from 'providers/ReduxStore/slices/collections/actions';
import { addCollectionToWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import StyledWrapper from './StyledWrapper';

const TitleBar = () => {
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [addCollectionToWSModalOpen, setAddCollectionToWSModalOpen] = useState(false);
  const { activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const isPlatformElectron = isElectron();
  const dispatch = useDispatch();

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="dropdown-icon cursor-pointer">
        <IconDots size={22} />
      </div>
    );
  });

  const handleTitleClick = () => dispatch(showHomePage());

  const handleOpenLocalCollection = () => {
    dispatch(openLocalCollection()).catch((err) => console.log(err) && toast.error('An error occured while opening the local collection'));
  };

  const handleAddCollectionToWorkspace = (collectionUid) => {
    setAddCollectionToWSModalOpen(false);
    dispatch(addCollectionToWorkspace(activeWorkspaceUid, collectionUid))
      .then(() => {
        toast.success('Collection added to workspace');
      })
      .catch(() => toast.error('An error occured while adding collection to workspace'));
  };

  const handleImportCollection = () => {
    importCollection()
      .then((collection) => {
        dispatch(collectionImported({ collection: collection }));
        dispatch(addCollectionToWorkspace(activeWorkspaceUid, collection.uid));
      })
      .catch((err) => console.log(err));
  };

  return (
    <StyledWrapper className="px-2 py-2">
      {createCollectionModalOpen ? <CreateCollection isLocal={createCollectionModalOpen === 'local' ? true : false} onClose={() => setCreateCollectionModalOpen(false)} /> : null}

      {addCollectionToWSModalOpen ? (
        <SelectCollection title="Add Collection to Workspace" onClose={() => setAddCollectionToWSModalOpen(false)} onSelect={handleAddCollectionToWorkspace} />
      ) : null}

      <div className="flex items-center">
        <div className="flex items-center cursor-pointer" onClick={handleTitleClick}>
          <Bruno width={30} />
        </div>
        <div
          onClick={handleTitleClick}
          className="flex items-center font-medium select-none cursor-pointer"
          style={{ fontSize: 14, paddingLeft: 6, position: 'relative', top: -1 }}
        >
          bruno
        </div>
        <div className="collection-dropdown flex flex-grow items-center justify-end">
          <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setCreateCollectionModalOpen(true);
              }}
            >
              Create Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                handleImportCollection();
              }}
            >
              Import Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setAddCollectionToWSModalOpen(true);
              }}
            >
              Add Collection to Workspace
            </div>
            {isPlatformElectron ? (
              <>
                <div className="font-medium label-item font-medium local-collection-label">
                  <div className="flex items-center">
                    <span className="mr-2">
                      <IconFolders size={18} strokeWidth={1.5} />
                    </span>
                    <span>Local Collections</span>
                  </div>
                </div>
                <div
                  className="dropdown-item"
                  onClick={(e) => {
                    setCreateCollectionModalOpen('local');
                    menuDropdownTippyRef.current.hide();
                  }}
                >
                  Create Local Collection
                </div>
                <div
                  className="dropdown-item"
                  onClick={(e) => {
                    handleOpenLocalCollection();
                    menuDropdownTippyRef.current.hide();
                  }}
                >
                  Open Local Collection
                </div>
              </>
            ) : (
              <div className="flex items-center select-none text-xs local-collections-unavailable">
                Note: Local collections are only available on the desktop app.
              </div>
            )}
          </Dropdown>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default TitleBar;
