import { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { IconBrandGithub, IconPlus, IconDownload, IconFolders, IconSpeakerphone, IconBook } from '@tabler/icons';

import Bruno from 'components/Bruno';
import CreateCollection from 'components/Sidebar/CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import StyledWrapper from './StyledWrapper';

const Welcome = () => {
  const dispatch = useDispatch();
  const [importedCollection, setImportedCollection] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch(
      (err) => console.log(err) && toast.error('An error occurred while opening the collection')
    );
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

  return (
    <StyledWrapper className="pb-4 px-6 mt-6">
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

      <div className="">
        <Bruno width={50} />
      </div>
      <div className="text-xl font-semibold select-none">bruno</div>
      <div className="mt-4">Opensource IDE for exploring and testing APIs</div>

      <div className="uppercase font-semibold heading mt-10">Collections</div>
      <div className="mt-4 flex items-center collection-options select-none">
        <div className="flex items-center" onClick={() => setCreateCollectionModalOpen(true)}>
          <IconPlus size={18} strokeWidth={2} />
          <span className="label ml-2" id="create-collection">
            Create Collection
          </span>
        </div>
        <div className="flex items-center ml-6" onClick={handleOpenCollection}>
          <IconFolders size={18} strokeWidth={2} />
          <span className="label ml-2">Open Collection</span>
        </div>
        <div className="flex items-center ml-6" onClick={() => setImportCollectionModalOpen(true)}>
          <IconDownload size={18} strokeWidth={2} />
          <span className="label ml-2" id="import-collection">
            Import Collection
          </span>
        </div>
      </div>

      <div className="uppercase font-semibold heading mt-10 pt-6">Links</div>
      <div className="mt-4 flex flex-col collection-options select-none">
        <div className="flex items-center mt-2">
          <a href="https://docs.usebruno.com" target="_blank" className="inline-flex items-center">
            <IconBook size={18} strokeWidth={2} />
            <span className="label ml-2">Documentation</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno/issues" target="_blank" className="inline-flex items-center">
            <IconSpeakerphone size={18} strokeWidth={2} />
            <span className="label ml-2">Report Issues</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno" target="_blank" className="flex items-center">
            <IconBrandGithub size={18} strokeWidth={2} />
            <span className="label ml-2">GitHub</span>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Welcome;
