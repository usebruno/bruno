import toast from 'react-hot-toast';
import Bruno from 'components/Bruno';
import CreateCollection from '../CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import { ActionIcon, Box, rem, Tooltip } from '@mantine/core';

import { IconPlus, IconFolderOpen, IconPackageImport } from '@tabler/icons-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';

const TitleBar = () => {
  const [importedCollection, setImportedCollection] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const dispatch = useDispatch();

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

  const handleTitleClick = () => dispatch(showHomePage());

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch(
      (err) => console.log(err) && toast.error('An error occurred while opening the collection')
    );
  };

  return (
    <Box m={'xs'}>
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

      <div className="flex items-center">
        <div className="flex items-center cursor-pointer" onClick={handleTitleClick}>
          <Bruno width={30} />
        </div>
        <div
          onClick={handleTitleClick}
          className="flex items-center font-medium select-none cursor-pointer"
          style={{ fontSize: 14, paddingLeft: 6, position: 'relative', top: -1 }}
        >
          Bruno lazer
        </div>
        <ActionIcon.Group ml={'auto'}>
          <Tooltip label="Import collection" openDelay={250}>
            <ActionIcon
              variant="default"
              size={'md'}
              aria-label={'Import collection'}
              onClick={() => setImportCollectionModalOpen(true)}
            >
              <IconPackageImport style={{ width: rem(16) }} stroke={1.5} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Open collection" openDelay={250}>
            <ActionIcon variant="default" size={'md'} aria-label={'Open collection'} onClick={handleOpenCollection}>
              <IconFolderOpen style={{ width: rem(16) }} stroke={1.5} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Create collection" openDelay={250}>
            <ActionIcon
              variant="default"
              size={'md'}
              aria-label={'Create collection'}
              onClick={() => setCreateCollectionModalOpen(true)}
            >
              <IconPlus style={{ width: rem(16) }} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </ActionIcon.Group>
      </div>
    </Box>
  );
};

export default TitleBar;
