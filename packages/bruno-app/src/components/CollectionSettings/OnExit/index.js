import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { flattenItems } from 'utils/collections';
import { getRelativePathWithinBasePath } from 'utils/common/path';
import { updateCollectionOnExit } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const DEFAULT_MESSAGE = 'Run this collection’s cleanup requests before quitting Bruno.';
const SUPPORTED_REQUEST_TYPES = ['http-request', 'graphql-request'];

const OnExit = ({ collection }) => {
  const dispatch = useDispatch();
  const currentConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.onExit', {})
    : get(collection, 'brunoConfig.onExit', {});
  const config = {
    enabled: false,
    showReminder: true,
    reminderMessage: DEFAULT_MESSAGE,
    requestPaths: [],
    ...currentConfig
  };

  const requests = flattenItems(collection.items || [])
    .filter((item) => SUPPORTED_REQUEST_TYPES.includes(item.type) && !item.isTransient && item.pathname)
    .map((item) => ({
      item,
      reference: getRelativePathWithinBasePath(collection.pathname, item.pathname, true)
    }));

  const update = (updates) => {
    dispatch(updateCollectionOnExit({
      collectionUid: collection.uid,
      onExit: { ...config, ...updates }
    }));
  };

  const toggleRequest = (requestPath) => {
    const selected = new Set(config.requestPaths || []);
    if (selected.has(requestPath)) selected.delete(requestPath);
    else selected.add(requestPath);
    update({ requestPaths: Array.from(selected) });
  };

  return (
    <StyledWrapper className="h-full w-full">
      <div className="bruno-form">
        <div className="flex items-center">
          <input
            id="onExit.enabled"
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="onExit.enabled">
            Enable cleanup when quitting Bruno
          </label>
        </div>
        <p className="description mt-2">
          This configuration is saved with the collection and shared with everyone who uses it.
        </p>

        <div className={`setting-card ${config.enabled ? '' : 'opacity-50'}`}>
          <div className="flex items-center">
            <input
              id="onExit.showReminder"
              type="checkbox"
              checked={config.showReminder}
              disabled={!config.enabled}
              onChange={(event) => update({ showReminder: event.target.checked })}
              className="mousetrap mr-0"
            />
            <label className="block ml-2 select-none" htmlFor="onExit.showReminder">
              Show a reminder before running cleanup
            </label>
          </div>
          <textarea
            aria-label="Exit reminder message"
            className="block textbox mt-3 w-full"
            disabled={!config.enabled || !config.showReminder}
            maxLength={2000}
            value={config.reminderMessage}
            onChange={(event) => update({ reminderMessage: event.target.value })}
          />
        </div>

        <div className={`setting-card ${config.enabled ? '' : 'opacity-50'}`}>
          <div className="font-medium">Cleanup requests</div>
          <p className="description mt-1">
            Selected HTTP and GraphQL requests run sequentially using this collection’s active environment.
          </p>
          <div className="request-list mt-3">
            {requests.length ? requests.map(({ item: request, reference }) => (
              <label className="request-row cursor-pointer" key={reference}>
                <input
                  type="checkbox"
                  checked={(config.requestPaths || []).includes(reference)}
                  disabled={!config.enabled}
                  onChange={() => toggleRequest(reference)}
                  className="mousetrap mr-3"
                />
                <span className="request-method">{request.request?.method || 'QUERY'}</span>
                <span className="min-w-0">
                  <span className="block truncate">{request.name || request.filename}</span>
                  <span className="description block truncate">{request.request?.url || ''}</span>
                </span>
              </label>
            )) : (
              <div className="description p-3">This collection has no HTTP or GraphQL requests.</div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <Button type="button" size="sm" onClick={() => dispatch(saveCollectionSettings(collection.uid))}>
            Save
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default OnExit;
