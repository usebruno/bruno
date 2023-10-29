import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

import {
  IconArrowsSort,
  IconDownload,
  IconFolders,
  IconPlus,
  IconSortAscendingLetters,
  IconSortDescendingLetters
} from '@tabler/icons';
import { IconSearch, IconX } from '@tabler/icons';
import Preferences from 'components/Preferences/index';
import CreateCollection from 'components/Sidebar/CreateCollection/index';
import ImportCollection from 'components/Sidebar/ImportCollection/index';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation/index';
import { showPreferences } from 'providers/ReduxStore/slices/app';
import { importCollection, openCollection, sortCollections } from 'providers/ReduxStore/slices/collections/actions';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const Actions = () => {
  const [importedCollection, setImportedCollection] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const preferencesOpen = useSelector((state) => state.app.showPreferences);
  const dispatch = useDispatch();
  const { ipcRenderer } = window;

  const { collections } = useSelector((state) => state.collections);
  const { collectionSortOrder } = useSelector((state) => state.collections);
  const sortCollectionOrder = () => {
    let order;
    switch (collectionSortOrder) {
      case 'default':
        order = 'alphabetical';
        break;
      case 'alphabetical':
        order = 'reverseAlphabetical';
        break;
      case 'reverseAlphabetical':
        order = 'default';
        break;
    }
    dispatch(sortCollections({ order }));
  };

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
      <div className="group flex-grow">
        <span className="group-title">Collections</span>
        <div className="flex flex-wrap justify-center">
          <div className="px-1 py-2">
            <button
              type="button"
              className="btn btn-secondary btn-xs flex flex-row"
              title="Create collection"
              onClick={(e) => {
                setCreateCollectionModalOpen(true);
              }}
            >
              <IconPlus strokeWidth={1.5} />
              Create
            </button>
          </div>
          <div className="px-1 py-2">
            <button
              type="button"
              className="btn btn-secondary btn-xs flex flex-row"
              title="Open collection"
              onClick={(e) => {
                handleOpenCollection();
              }}
            >
              <IconFolders strokeWidth={1.5} />
              Open
            </button>
          </div>
          <div className="px-1 py-2">
            <button
              type="button"
              className="btn btn-secondary btn-xs flex flex-row"
              title="Import collection"
              onClick={(e) => {
                setImportCollectionModalOpen(true);
              }}
            >
              <IconDownload strokeWidth={1.5} />
              Import
            </button>
          </div>
          <div className=" relative collection-filter py-2 px-1 flex-grow">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">
                <IconSearch size={16} strokeWidth={1.5} />
              </span>
            </div>
            <input
              type="text"
              name="search"
              id="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="block w-full pl-7 py-1 sm:text-sm"
              placeholder="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value.toLowerCase())}
            />
            {searchText !== '' && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <span
                  className="close-icon"
                  onClick={() => {
                    setSearchText('');
                  }}
                >
                  <IconX size={16} strokeWidth={1.5} className="cursor-pointer" />
                </span>
              </div>
            )}
          </div>
          {collections.length >= 1 && (
            <button type="button" className="btn btx-xs flex-grow" onClick={() => sortCollectionOrder()}>
              {collectionSortOrder == 'default' ? (
                <span className="flex flex-row w-40">
                  <IconArrowsSort strokeWidth={1.5} />
                  default
                </span>
              ) : collectionSortOrder == 'alphabetical' ? (
                <span className="flex flex-row w-40">
                  <IconSortAscendingLetters strokeWidth={1.5} />
                  ascending
                </span>
              ) : (
                <span className="flex flex-row w-40">
                  <IconSortDescendingLetters strokeWidth={1.5} />
                  descending
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Actions;
