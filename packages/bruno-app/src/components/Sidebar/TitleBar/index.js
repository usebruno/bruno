import toast from 'react-hot-toast';
import Bruno from 'components/Bruno';
import Dropdown from 'components/Dropdown';
import CreateCollection from '../CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';

import { IconDots } from '@tabler/icons';
import { useState, forwardRef, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import ConfirmCollectionImportUpdate from 'components/ConfirmCollectionImportUpdate/index';

const TitleBar = () => {
  const [importedCollection, setImportedCollection] = useState(null);
  const [importedCollectionLocation, setImportedCollectionLocation] = useState(null);
  const [importedTranslationLog, setImportedTranslationLog] = useState({});
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const [confirmCollectionImportUpdateModalOpen, setConfirmCollectionImportUpdateModalOpen] = useState(false);
  const dispatch = useDispatch();
  const { ipcRenderer } = window;

  const handleImportCollection = ({ collection, translationLog }) => {
    setImportedCollection(collection);
    if (translationLog) {
      setImportedTranslationLog(translationLog);
    }
    setImportCollectionModalOpen(false);
    setImportCollectionLocationModalOpen(true);
  };

  const cleanupAfterSuccessfulImport = () => {
    setImportCollectionLocationModalOpen(false);
    setImportedCollection(null);
    setImportedCollectionLocation(null);
    toast.success('Collection imported successfully');
  };

  const cleanupAndShowImportError = (err) => {
    setImportCollectionLocationModalOpen(false);
    setImportedCollection(null);
    setImportedCollectionLocation(null);
    console.error(err);
    toast.error('An error occurred while importing the collection. Check the logs for more information.');
  };

  const handleImportCollectionLocation = (collectionLocation) => {
    setImportedCollectionLocation(collectionLocation);
    setImportCollectionLocationModalOpen(false);
    dispatch(importCollection(importedCollection, collectionLocation))
      .then(() => {
        cleanupAfterSuccessfulImport();
      })
      .catch((err) => {
        // Note: the string here must exactly match the start of the error thrown in
        // `bruno-electron/src/ipc/collection.js` when the folder already exists
        if (err instanceof Error && err.message.includes('collection already exists')) {
          setConfirmCollectionImportUpdateModalOpen(true);
        } else {
          cleanupAndShowImportError(err);
        }
      });
  };

  const handleConfirmCollectionImportUpdate = (shouldUpdate) => {
    setConfirmCollectionImportUpdateModalOpen(false);
    setImportCollectionLocationModalOpen(false);
    if (shouldUpdate) {
      dispatch(importCollection(importedCollection, importedCollectionLocation, true))
        .then(() => {
          cleanupAfterSuccessfulImport();
        })
        .catch((err) => {
          cleanupAndShowImportError(err);
        });
    } else {
      cleanupAndShowImportError();
    }
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
          translationLog={importedTranslationLog}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      ) : null}
      {confirmCollectionImportUpdateModalOpen ? (
        <ConfirmCollectionImportUpdate
          onConfirm={() => handleConfirmCollectionImportUpdate(true)}
          onCancel={() => handleConfirmCollectionImportUpdate(false)}
        />
      ) : null}

      <div className="flex items-center">
        <button className="flex items-center gap-2 text-sm font-medium" onClick={handleTitleClick}>
          <span aria-hidden>
            <Bruno width={30} />
          </span>
          bruno
        </button>
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
