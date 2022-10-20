import { useState } from 'react';
import { useTheme } from '../../../../providers/Theme';
import { useSelector, useDispatch } from 'react-redux';
import { createCollection } from 'providers/ReduxStore/slices/collections/actions';
import { addCollectionToWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';

import toast from 'react-hot-toast';
import styled from 'styled-components';
import CreateCollection from 'components/Sidebar/CreateCollection';
import SelectCollection from 'components/Sidebar/Collections/SelectCollection';

const LinkStyle = styled.span`
  color: ${(props) => props.theme['text-link']};
`;

const CreateOrAddCollection = () => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [addCollectionToWSModalOpen, setAddCollectionToWSModalOpen] = useState(false);
  const { activeWorkspaceUid } = useSelector((state) => state.workspaces);

  const handleCreateCollection = (values) => {
    setCreateCollectionModalOpen(false);
    dispatch(createCollection(values.collectionName))
      .then(() => {
        toast.success('Collection created');
      })
      .catch(() => toast.error('An error occured while creating the collection'));
  };

  const handleAddCollectionToWorkspace = (collectionUid) => {
    setAddCollectionToWSModalOpen(false);
    dispatch(addCollectionToWorkspace(activeWorkspaceUid, collectionUid))
      .then(() => {
        toast.success('Collection added to workspace');
      })
      .catch(() => toast.error('An error occured while adding collection to workspace'));
  };

  const CreateLink = () => (
    <LinkStyle className="underline text-link cursor-pointer" theme={theme} onClick={() => setCreateCollectionModalOpen(true)}>
      Create
    </LinkStyle>
  );
  const AddLink = () => (
    <LinkStyle className="underline text-link cursor-pointer" theme={theme} onClick={() => setAddCollectionToWSModalOpen(true)}>
      Add
    </LinkStyle>
  );

  return (
    <div className="px-2 mt-4 text-gray-600">
      {createCollectionModalOpen ? <CreateCollection handleCancel={() => setCreateCollectionModalOpen(false)} handleConfirm={handleCreateCollection} /> : null}

      {addCollectionToWSModalOpen ? (
        <SelectCollection title="Add Collection to Workspace" onClose={() => setAddCollectionToWSModalOpen(false)} onSelect={handleAddCollectionToWorkspace} />
      ) : null}

      <div className="text-xs text-center">
        <div>No collections found.</div>
        <div className="mt-2">
          <CreateLink /> or <AddLink /> Collection to Workspace.
        </div>
      </div>
    </div>
  );
};

export default CreateOrAddCollection;
