import toast from 'react-hot-toast';
import Bruno from 'components/Bruno';
import Dropdown from 'components/Dropdown';
import CreateCollection from '../CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';

import { IconDots } from '@tabler/icons';
import { useState, forwardRef, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import { openCollection, importCollection, getBrunoVersion } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import CloneCollection from 'components/Sidebar/CloneCollection';
import versionCheck from '@version-checker/core';

const TitleBar = () => {
  const [importedCollection, setImportedCollection] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const [cloneCollectionModalOpen, setCloneCollectionModalOpen] = useState(false);
  const [newReleaseUrl, setNewReleaseUrl] = useState('');
  const dispatch = useDispatch();
  const { ipcRenderer } = window;

  const brunoVersion = useSelector((state) => state.app.brunoVersion);

  useEffect(() => {
    dispatch(getBrunoVersion()).then(() => {
      versionCheck({
        repo: 'bruno',
        owner: 'Evgeniy-xlv',
        currentVersion: brunoVersion
      }).then((result) => {
        const update = result.update;
        if (update && !update.isDraft && !update.isPrerelease) {
          setNewReleaseUrl(update.url);
        }
      });
    });
  }, [brunoVersion]);

  const handleImportCollection = (collection) => {
    setImportedCollection(collection);
    setImportCollectionModalOpen(false);
    setImportCollectionLocationModalOpen(true);
  };

  const handleImportCollectionLocation = (collectionLocation) => {
    dispatch(importCollection(importedCollection, collectionLocation));
    setImportCollectionLocationModalOpen(false);
    setImportedCollection(null);
    toast.success('Collection imported successfully');
  };

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
  const handleNewReleaseClick = () => window.open(newReleaseUrl);

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch(
      (err) => console.log(err) && toast.error('An error occurred while opening the collection')
    );
  };

  const openDevTools = () => {
    ipcRenderer.invoke('renderer:open-devtools');
  };

  return (
    <StyledWrapper className="px-2 py-2">
      {createCollectionModalOpen ? <CreateCollection onClose={() => setCreateCollectionModalOpen(false)} /> : null}
      {importCollectionModalOpen ? (
        <ImportCollection onClose={() => setImportCollectionModalOpen(false)} handleSubmit={handleImportCollection} />
      ) : null}
      {importCollectionLocationModalOpen ? (
        <ImportCollectionLocation
          collectionName={importedCollection.name}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      ) : null}
      {cloneCollectionModalOpen && <CloneCollection onClose={() => setCloneCollectionModalOpen(false)} />}

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
        {newReleaseUrl.length > 0 ? (
          <div
            onClick={handleNewReleaseClick}
            className="flex items-center font-medium select-none cursor-pointer"
            style={{ fontSize: 14, paddingLeft: 6, position: 'relative', top: -1, color: '#546de5' }}
          >
            New release is available!
          </div>
        ) : null}
        <div className="collection-dropdown flex flex-grow items-center justify-end">
          <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
            <div
              className="dropdown-item"
              onClick={(e) => {
                setCreateCollectionModalOpen(true);
                menuDropdownTippyRef.current.hide();
              }}
            >
              Create Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                handleOpenCollection();
                menuDropdownTippyRef.current.hide();
              }}
            >
              Open Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setImportCollectionModalOpen(true);
              }}
            >
              Import Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setCloneCollectionModalOpen(true);
              }}
            >
              Clone Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                openDevTools();
              }}
            >
              Devtools
            </div>
          </Dropdown>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default TitleBar;
