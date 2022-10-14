import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  IconPlus,
  IconUpload,
  IconFiles,
  IconFolders,
  IconPlayerPlay,
  IconBrandChrome,
  IconSpeakerphone,
  IconDeviceDesktop
} from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { collectionImported } from 'providers/ReduxStore/slices/collections';
import { createCollection } from 'providers/ReduxStore/slices/collections/actions';
import { addCollectionToWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import Bruno from 'components/Bruno';
import CreateCollection from 'components/Sidebar/CreateCollection';
import SelectCollection from 'components/Sidebar/Collections/SelectCollection';
import importCollection from 'utils/collections/import';
import StyledWrapper from './StyledWrapper';

const Welcome = () => {
  const dispatch = useDispatch();
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [addCollectionToWSModalOpen, setAddCollectionToWSModalOpen] = useState(false);
  const { activeWorkspaceUid } = useSelector((state) => state.workspaces);

  const handleCreateCollection = (values) => {
    setCreateCollectionModalOpen(false);
    dispatch(createCollection(values.collectionName))
      .then(() => {
        toast.success("Collection created");
      })
      .catch(() => toast.error("An error occured while creating the collection"));
  };

  const handleAddCollectionToWorkspace = (collectionUid) => {
    setAddCollectionToWSModalOpen(false);
    dispatch(addCollectionToWorkspace(activeWorkspaceUid, collectionUid))
      .then(() => {
        toast.success("Collection added to workspace");
      })
      .catch(() => toast.error("An error occured while adding collection to workspace"));
  };

  const handleImportCollection = () => {
    importCollection()
      .then((collection) => {
        dispatch(collectionImported({collection: collection}));
        dispatch(addCollectionToWorkspace(activeWorkspaceUid, collection.uid));
      })
      .catch((err) => console.log(err));
  };

  return (
    <StyledWrapper className="pb-4 px-6 mt-6">
      {createCollectionModalOpen ? (
        <CreateCollection
          handleCancel={() => setCreateCollectionModalOpen(false)}
          handleConfirm={handleCreateCollection}
        />
      ) : null}
      
      {addCollectionToWSModalOpen ? (
        <SelectCollection
          title='Add Collection to Workspace'
          onClose={() => setAddCollectionToWSModalOpen(false)}
          onSelect={handleAddCollectionToWorkspace}
        />
      ): null}

      <div className="">
        <Bruno width={50} />
      </div>
      <div className="text-xl font-semibold select-none">bruno</div>
      <div className="mt-4">Opensource API Client.</div>

      <div className="uppercase font-semibold create-request mt-10">Collections</div>
      <div className="mt-4 flex items-center collection-options select-none">
        <div className="flex items-center">
          <IconPlus size={18} strokeWidth={2}/><span className="label ml-2" onClick={() => setCreateCollectionModalOpen(true)}>Create Collection</span>
        </div>
        <div className="flex items-center ml-6">
          <IconFiles size={18} strokeWidth={2}/><span className="label ml-2" onClick={() => setAddCollectionToWSModalOpen(true)}>Add Collection to Workspace</span>
        </div>
        <div className="flex items-center ml-6" onClick={handleImportCollection}>
          <IconUpload size={18} strokeWidth={2}/><span className="label ml-2">Import Collection</span>
        </div>
        <div className="flex items-center ml-6">
          <IconPlayerPlay size={18} strokeWidth={2}/><span className="label ml-2">Load Sample Collection</span>
        </div>
      </div>

      <div className="uppercase font-semibold create-request mt-10 pt-6">Local Collections</div>
      <div className="mt-4 flex items-center collection-options select-none">
        <div className="flex items-center">
          <IconPlus size={18} strokeWidth={2}/><span className="label ml-2" onClick={() => setCreateCollectionModalOpen(true)}>Create Collection</span>
        </div>
        <div className="flex items-center ml-6">
          <IconFolders size={18} strokeWidth={2}/><span className="label ml-2">Open Collection</span>
        </div>
      </div>

      <div className="uppercase font-semibold create-request mt-10 pt-6">Links</div>
      <div className="mt-4 flex flex-col collection-options select-none">
        <div className="flex items-center">
          <IconBrandChrome size={18} strokeWidth={2}/><span className="label ml-2">Chrome Extension</span>
        </div>
        <div className="flex items-center mt-2">
          <IconDeviceDesktop size={18} strokeWidth={2}/><span className="label ml-2">Desktop App</span>
        </div>
        <div className="flex items-center mt-2">
          <IconSpeakerphone size={18} strokeWidth={2}/><span className="label ml-2">Report Issues</span>
        </div>
        {/* <div className="flex items-center mt-2">
          <IconBook size={18} strokeWidth={2}/><span className="label ml-2">Docs</span>
        </div> */}
        <div className="flex items-center mt-2">
          <img src='/github.svg' style={{width: '18px'}}/>
          <span className="label ml-2">Github</span>
        </div>
      </div>

    </StyledWrapper>
  )
};

export default Welcome;
