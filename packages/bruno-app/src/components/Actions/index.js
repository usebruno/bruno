import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';

import { useState, forwardRef, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import { IconSettings, IconPlus, IconFolders, IconDownload, IconActivity } from '@tabler/icons';
import { showPreferences } from 'providers/ReduxStore/slices/app';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import CreateCollection from 'components/Sidebar/CreateCollection/index';
import ImportCollection from 'components/Sidebar/ImportCollection/index';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation/index';
import Preferences from 'components/Preferences/index';

const Actions = () => {
  const [importedCollection, setImportedCollection] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const preferencesOpen = useSelector((state) => state.app.showPreferences);
  const dispatch = useDispatch();
  const { ipcRenderer } = window;

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

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch(
      (err) => console.log(err) && toast.error('An error occurred while opening the collection')
    );
  };

  const openDevTools = () => {
    ipcRenderer.invoke('renderer:open-devtools');
  };

  return (
    <StyledWrapper className="px-2 py-1 flex flex-row">
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
      {preferencesOpen && <Preferences onClose={() => dispatch(showPreferences(false))} />}
      <div className="group flex flex-row">
        <div className="px-1 py-2 flex-initial">
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            title="Create collection"
            onClick={(e) => {
              setCreateCollectionModalOpen(true);
            }}
          >
            <IconPlus strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-1 py-2 flex-initial">
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            title="Open collection"
            onClick={(e) => {
              handleOpenCollection();
            }}
          >
            <IconFolders strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-1 py-2 flex-initial">
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            title="Import collection"
            onClick={(e) => {
              setImportCollectionModalOpen(true);
            }}
          >
            <IconDownload strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div class="flex-grow"></div>
      <div className="group flex flex-row">
        <div className="px-1 py-2 flex-initial">
          <button
            type="button"
            title="Preferences"
            className="btn btn-secondary btn-xs "
            onClick={(e) => {
              dispatch(showPreferences(true));
            }}
          >
            <IconSettings strokeWidth={1.5} />
          </button>
        </div>
        <div className="py-2 flex-initial">
          <button
            type="button"
            className="btn btn-xs"
            title="Devtools"
            onClick={(e) => {
              openDevTools();
            }}
          >
            <IconActivity strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Actions;
