import React, { useState } from 'react';
import { IconPlus, IconUpload, IconFiles, IconFolders } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { createCollection } from 'providers/ReduxStore/slices/collections';
import Bruno from 'components/Bruno';
import CreateCollection from 'components/Sidebar/CreateCollection';
import StyledWrapper from './StyledWrapper';

const Welcome = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const dispatch = useDispatch();

  const handleCancel = () => setModalOpen(false);
  const handleConfirm = (values) => {
    setModalOpen(false);
    dispatch(createCollection(values.collectionName, values.collectionLocation));
  };

  return (
    <StyledWrapper className="pb-4 px-6 mt-6">
      {modalOpen ? (
        <CreateCollection
          handleCancel={handleCancel}
          handleConfirm={handleConfirm}
        />
      ) : null}
      <div className="">
        <Bruno width={50} />
      </div>
      <div className="text-xl font-semibold select-none">bruno</div>
      <div className="mt-4">Opensource API Client.</div>

      <div className="uppercase font-semibold create-request mt-10">Collections</div>
      <div className="mt-4 flex items-center collection-options">
        <div className="flex items-center">
          <IconPlus size={18} strokeWidth={2}/><span className="label ml-2" onClick={() => setModalOpen(true)}>Create Collection</span>
        </div>
        <div className="flex items-center ml-6">
          <IconFiles size={18} strokeWidth={2}/><span className="label ml-2">Add Collection to Workspace</span>
        </div>
        <div className="flex items-center ml-6">
          <IconUpload size={18} strokeWidth={2}/><span className="label ml-2">Import Collection</span>
        </div>
      </div>

      <div className="uppercase font-semibold create-request mt-10 pt-6">Local Collections</div>
      <div className="mt-4 flex items-center collection-options">
        <div className="flex items-center">
          <IconPlus size={18} strokeWidth={2}/><span className="label ml-2" onClick={() => setModalOpen(true)}>Create Collection</span>
        </div>
        <div className="flex items-center ml-6">
          <IconFolders size={18} strokeWidth={2}/><span className="label ml-2">Open Collection</span>
        </div>
      </div>

    </StyledWrapper>
  )
};

export default Welcome;
