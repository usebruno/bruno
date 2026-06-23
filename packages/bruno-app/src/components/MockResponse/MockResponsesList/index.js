import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconPlus } from '@tabler/icons';
import {
  createMockResponse,
  loadMockResponses,
  saveMockResponse
} from 'providers/ReduxStore/slices/mock-server';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import {
  copyExampleToMockResponse,
  resolveMockResponseLocation
} from 'utils/mock-responses';
import ImportFromExampleModal from '../ImportFromExampleModal';

const MockResponsesList = ({ instance, collection }) => {
  const dispatch = useDispatch();
  const [importOpen, setImportOpen] = useState(false);
  const responses = useSelector((state) => state.mockServer.mockResponses[instance.uid] || []);
  const location = resolveMockResponseLocation(instance, collection);

  useEffect(() => {
    dispatch(loadMockResponses(location));
  }, [dispatch, instance.uid, collection?.pathname, instance.sourceType]);

  const openResponseTab = (response) => {
    dispatch(addTab({
      uid: response.uid,
      type: 'mock-response',
      mockServerUid: instance.uid,
      collectionUid: collection?.uid || instance.collectionUid,
      responseName: response.name,
      tabName: response.name
    }));
  };

  const handleCreate = async () => {
    try {
      const result = await dispatch(createMockResponse({
        ...location,
        name: 'New Mock Response'
      })).unwrap();
      openResponseTab(result.response);
    } catch (err) {
      toast.error(err.message || 'Failed to create mock response');
    }
  };

  const handleImport = async ({ item, example }) => {
    try {
      const response = copyExampleToMockResponse(example, item);
      const result = await dispatch(saveMockResponse({
        ...location,
        response
      })).unwrap();

      setImportOpen(false);
      openResponseTab(result.response);
      toast.success('Mock response created from example');
    } catch (err) {
      toast.error(err.message || 'Failed to import example');
    }
  };

  return (
    <>
      {importOpen && collection ? (
        <ImportFromExampleModal
          collection={collection}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      ) : null}

      <div className="flex items-center gap-2 mb-3">
        <button type="button" className="action-btn start-btn" onClick={handleCreate}>
          <IconPlus size={14} className="mr-1" />
          Create Mock Response
        </button>
        {instance.sourceType === 'collection' && collection ? (
          <button type="button" className="action-btn" onClick={() => setImportOpen(true)}>
            Import from Example
          </button>
        ) : null}
      </div>

      {responses.length === 0 ? (
        <div className="text-sm opacity-70">
          No mock responses yet. Create one to define routes and responses for this mock server.
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          {responses.map((response) => (
            <button
              key={response.uid}
              type="button"
              className="w-full text-left px-4 py-3 border-b hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => openResponseTab(response)}
            >
              <div className="font-medium text-sm">{response.name}</div>
              <div className="text-xs opacity-70 mt-1">
                {(response.request?.method || 'GET').toUpperCase()} {response.request?.url}
              </div>
              <div className="text-xs opacity-60 mt-1">
                {response.rules?.conditions?.length
                  ? `${response.rules.conditions.length} rule(s), ${response.rules.operator || 'AND'}`
                  : 'No rules (default match)'}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default MockResponsesList;
