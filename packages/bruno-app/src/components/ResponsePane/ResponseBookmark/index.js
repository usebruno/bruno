import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { IconBookmark } from '@tabler/icons';
import { addResponseExample } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { insertTaskIntoQueue } from 'providers/ReduxStore/slices/app';
import { uuid } from 'utils/common';
import toast from 'react-hot-toast';
import CreateExampleModal from 'components/ResponseExample/CreateExampleModal';
import { getBodyType } from 'utils/responseBodyProcessor';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const ResponseBookmark = ({ item, collection, responseSize }) => {
  const dispatch = useDispatch();
  const [showSaveResponseExampleModal, setShowSaveResponseExampleModal] = useState(false);
  const response = item.response || {};

  const isResponseTooLarge = responseSize >= 5 * 1024 * 1024; // 5 MB

  // Only show for HTTP requests
  if (item.type !== 'http-request') {
    return null;
  }

  // Generate initial name for the example
  const getInitialExampleName = () => {
    const baseName = 'example';
    const existingExamples = item.draft?.examples || item.examples || [];

    // Check if any existing example has the same base name
    const hasSameBaseName = existingExamples.some((example) => {
      const exampleName = example.name || '';
      return exampleName === baseName || exampleName.startsWith(baseName);
    });

    if (!hasSameBaseName) {
      return baseName;
    }

    // Find the highest existing counter
    let maxCounter = 0;
    existingExamples.forEach((example) => {
      const exampleName = example.name || '';
      if (exampleName.startsWith(baseName)) {
        maxCounter++;
      }
    });

    return `${baseName} (${maxCounter})`;
  };

  const handleSaveClick = () => {
    if (!response || response.error) {
      toast.error('No valid response to save as example');
      return;
    }

    if (isResponseTooLarge) {
      toast.error('Response size exceeds 5MB limit. Cannot save as example.');
      return;
    }

    setShowSaveResponseExampleModal(true);
  };

  const saveAsExample = async (name, description = '') => {
    // Convert headers object to array format expected by schema
    const headersArray = response.headers && typeof response.headers === 'object'
      ? Object.entries(response.headers).map(([name, value]) => ({
          name,
          value,
          enabled: true
        }))
      : [];

    const contentTypeHeader = headersArray.find((h) => h.name?.toLowerCase() === 'content-type');
    const contentType = contentTypeHeader?.value?.toLowerCase() || '';

    const bodyType = getBodyType(contentType);
    const content = response.data;

    const exampleData = {
      name: name,
      status: response.status || 200,
      headers: headersArray,
      body: {
        type: bodyType,
        content: content
      },
      description: description
    };

    // Calculate the index where the example will be saved
    // This will be the length of the examples array after adding the new one
    const existingExamples = item.draft?.examples || item.examples || [];
    const exampleIndex = existingExamples.length;
    const exampleUid = uuid();

    dispatch(addResponseExample({
      itemUid: item.uid,
      collectionUid: collection.uid,
      example: {
        ...exampleData,
        uid: exampleUid
      }
    }));

    // Save the request
    await dispatch(saveRequest(item.uid, collection.uid));

    // Task middleware will track this and open the example in a new tab once the file is reloaded
    dispatch(insertTaskIntoQueue({
      uid: exampleUid,
      type: 'OPEN_EXAMPLE',
      collectionUid: collection.uid,
      itemUid: item.uid,
      exampleIndex: exampleIndex
    }));

    setShowSaveResponseExampleModal(false);
    toast.success(`Example "${name}" created successfully`);
  };

  return (
    <>
      <StyledWrapper className="ml-2 flex items-center">
        <button
          onClick={handleSaveClick}
          disabled={isResponseTooLarge}
          title={
            isResponseTooLarge
              ? 'Response size exceeds 5MB limit. Cannot save as example.'
              : 'Save current response as example'
          }
          className={classnames('p-1', {
            'opacity-50 cursor-not-allowed': isResponseTooLarge
          })}
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
