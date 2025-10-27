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
  const [showSaveResponseExampleModal, setShowSaveResponseExampleModal] = useState(false);
  const response = item.response || {};

  // Only show for HTTP requests
  if (item.type !== 'http-request') {
    return null;
  }

  // Generate initial name for the example
  const getInitialExampleName = () => {
    const requestName = item.name || 'request';
    const existingExamples = item.draft?.examples || item.examples || [];
    const exampleCount = existingExamples.length;

    if (exampleCount === 0) {
      return `${requestName} example`;
    }
    return `${requestName} example (${exampleCount})`;
  };

  const handleSaveClick = () => {
    if (!response || response.error) {
      toast.error('No valid response to save as example');
      return;
    }
    setShowSaveResponseExampleModal(true);
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
    setShowSaveResponseExampleModal(false);
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
        isOpen={showSaveResponseExampleModal}
        onClose={() => setShowSaveResponseExampleModal(false)}
        onSave={saveAsExample}
        title="Save Response as Example"
        initialName={getInitialExampleName()}
      />
    </>
  );
};

export default ResponseBookmark;
