import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { saveMockResponse, deleteMockResponse, loadMockResponses } from 'providers/ReduxStore/slices/mock-server';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { resolveMockResponseLocation } from 'utils/mock-responses';
import MockResponseRules from './MockResponseRules';
import StyledWrapper from './StyledWrapper';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

const MockResponse = ({ instance, collection, response }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [draft, setDraft] = useState(response);
  const [editMode, setEditMode] = useState(!response?.response?.body?.content);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(response);
  }, [response]);

  const location = useMemo(() => resolveMockResponseLocation(instance, collection), [instance, collection]);

  useEffect(() => {
    dispatch(loadMockResponses(location));
  }, [dispatch, location.mockServerUid, location.collectionPath, location.sourceType]);

  const updateDraft = (patch) => {
    setDraft((current) => ({
      ...current,
      ...patch
    }));
  };

  const updateRequest = (patch) => {
    setDraft((current) => ({
      ...current,
      request: {
        ...current.request,
        ...patch
      }
    }));
  };

  const updateResponse = (patch) => {
    setDraft((current) => ({
      ...current,
      response: {
        ...current.response,
        ...patch
      }
    }));
  };

  const handleSave = async () => {
    if (!draft?.name?.trim()) {
      toast.error('Mock response name is required');
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(saveMockResponse({
        ...location,
        response: draft
      })).unwrap();
      setEditMode(false);
      toast.success('Mock response saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save mock response');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteMockResponse({
        ...location,
        responseUid: draft.uid
      })).unwrap();
      dispatch(closeTabs({ tabUids: [draft.uid] }));
      toast.success('Mock response deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete mock response');
    }
  };

  const getMethodClass = () => {
    switch ((draft?.request?.method || 'GET').toUpperCase()) {
      case 'POST':
        return 'method-post';
      case 'PUT':
        return 'method-put';
      case 'PATCH':
        return 'method-patch';
      case 'DELETE':
        return 'method-delete';
      default:
        return 'method-get';
    }
  };

  if (!draft) {
    return <div className="p-4">Mock response not found.</div>;
  }

  return (
    <StyledWrapper className="flex flex-col h-full px-4 py-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0 mr-4">
          {editMode ? (
            <input
              type="text"
              className="w-full font-medium"
              value={draft.name || ''}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="Mock response name"
            />
          ) : (
            <h2 className="font-medium truncate">{draft.name}</h2>
          )}
          {draft.copiedFrom?.exampleName ? (
            <div className="text-xs opacity-60 mt-1">
              Copied from example: {draft.copiedFrom.exampleName}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button type="button" className="action-btn" onClick={() => setEditMode(false)} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="action-btn start-btn" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="action-btn" onClick={() => setEditMode(true)}>
                Edit
              </button>
              <button type="button" className="action-btn stop-btn" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="url-bar-container flex items-center p-2 rounded-md mb-4">
        {editMode ? (
          <select
            className="method mr-2"
            value={(draft.request?.method || 'GET').toUpperCase()}
            onChange={(event) => updateRequest({ method: event.target.value })}
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        ) : (
          <div className={`method flex items-center justify-center px-2 rounded h-6 mr-2 font-medium uppercase ${getMethodClass()}`}>
            {(draft.request?.method || 'GET').toUpperCase()}
          </div>
        )}

        <input
          type="text"
          className="flex-1 min-w-0"
          value={draft.request?.url || ''}
          readOnly={!editMode}
          onChange={(event) => updateRequest({ url: event.target.value })}
          placeholder="/path"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <section>
          <div className="text-sm font-medium mb-2">Response</div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs" htmlFor="mock-response-status">Status</label>
            <input
              id="mock-response-status"
              type="number"
              className="w-24"
              value={draft.response?.status || 200}
              readOnly={!editMode}
              onChange={(event) => updateResponse({ status: Number(event.target.value) || 200 })}
            />
            <select
              value={draft.response?.body?.type || 'json'}
              disabled={!editMode}
              onChange={(event) => updateResponse({
                body: {
                  ...draft.response?.body,
                  type: event.target.value
                }
              })}
            >
              <option value="json">JSON</option>
              <option value="text">Text</option>
              <option value="xml">XML</option>
              <option value="html">HTML</option>
            </select>
          </div>

          <div className="editor-section overflow-hidden">
            <CodeEditor
              collection={collection}
              value={draft.response?.body?.content || ''}
              mode={draft.response?.body?.type === 'json' ? 'application/ld+json' : 'application/text'}
              theme={displayedTheme}
              readOnly={!editMode}
              onChange={(value) => updateResponse({
                body: {
                  ...draft.response?.body,
                  content: value
                }
              })}
              height="320px"
            />
          </div>
        </section>

        <section>
          <MockResponseRules
            rules={draft.rules}
            editMode={editMode}
            onChange={(rules) => updateDraft({ rules })}
          />
        </section>
      </div>
    </StyledWrapper>
  );
};

export default MockResponse;
