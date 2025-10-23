import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconBookmark } from '@tabler/icons';
import { addResponseExample } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import CreateExampleModal from 'components/ResponseExample/CreateExampleModal';
import StyledWrapper from './StyledWrapper';

const ResponseBookmark = ({ item, collection }) => {
  const dispatch = useDispatch();
  const [showNameModal, setShowNameModal] = useState(false);
  const response = item.response || {};

  // Only show for HTTP requests
  if (item.type !== 'http-request') {
    return null;
  }

  const handleSaveClick = () => {
    if (!response || response.error) {
      toast.error('No valid response to save as example');
      return;
    }
    setShowNameModal(true);
  };

  const saveAsExample = (name, description = '') => {
    // Convert headers object to array format expected by schema
    const headersArray = response.headers && typeof response.headers === 'object'
      ? Object.entries(response.headers).map(([name, value]) => ({
          name,
          value,
          enabled: true
        }))
      : [];

    // Only pass response-related data - the reducer will automatically capture current request state
    const exampleData = {
      name: name,
      status: response.status || 200,
      headers: headersArray,
      body: response.data || response.dataBuffer || '',
      description: description
    };

    dispatch(addResponseExample({
      itemUid: item.uid,
      collectionUid: collection.uid,
      example: exampleData
    }));
    dispatch(saveRequest(item.uid, collection.uid));
    setShowNameModal(false);
    toast.success(`Example "${name}" created successfully`);
  };

  return (
    <>
      <StyledWrapper className="ml-2 flex items-center">
        <button
          onClick={handleSaveClick}
          disabled={!response || response.error}
          title="Save current response as example"
          className="p-1"
          data-testid="response-bookmark-btn"
        >
          <IconBookmark size={16} strokeWidth={1.5} />
        </button>
      </StyledWrapper>

      <CreateExampleModal
        isOpen={showNameModal}
        onClose={() => setShowNameModal(false)}
        onSave={saveAsExample}
        title="Save Response as Example"
      />
    </>
  );
};

export default ResponseBookmark;
