import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { IconTag, IconLayoutDashboard } from '@tabler/icons';
import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
import TabPanelSelector from 'components/RequestPane/Settings/TabPanelSelector';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
import { getDefaultTabPanelForHttpMethod, getDefaultTabPanelForGraphQL } from 'utils/common/defaultTabPanel';
import Tags from './Tags/index';

const Settings = ({ item, collection }) => {
  const dispatch = useDispatch();

  // get the length of active params, headers, asserts and vars as well as the contents of the body, tests and script
  const getPropertyFromDraftOrRequest = (propertyKey) =>
    item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

  const { encodeUrl, defaultTabPanel } = getPropertyFromDraftOrRequest('settings');
  const requestType = get(item, 'request.type', 'http');

  const method = item.draft ? get(item, 'draft.request.method', 'GET') : get(item, 'request.method', 'GET');

  const getEffectiveDefaultTabPanel = () => {
    if (defaultTabPanel) {
      return defaultTabPanel;
    }
    if (requestType === 'graphql-request') {
      return getDefaultTabPanelForGraphQL();
    } else {
      return getDefaultTabPanelForHttpMethod(method);
    }
  };

  const effectiveDefaultTabPanel = getEffectiveDefaultTabPanel();

  const onToggleUrlEncoding = useCallback(() => {
    dispatch(
      updateItemSettings({
        collectionUid: collection.uid,
        itemUid: item.uid,
        settings: { encodeUrl: !encodeUrl }
      })
    );
  }, [encodeUrl, dispatch, collection.uid, item.uid]);

  const onChangeDefaultTabPanel = useCallback(
    (value) => {
      dispatch(
        updateItemSettings({
          collectionUid: collection.uid,
          itemUid: item.uid,
          settings: { defaultTabPanel: value }
        })
      );
    },
    [dispatch, collection.uid, item.uid]
  );

  const tabPanelOptions =
    requestType === 'http-request'
      ? [
          { value: 'params', label: 'Params' },
          { value: 'body', label: 'Body' },
          { value: 'headers', label: 'Headers' },
          { value: 'auth', label: 'Auth' }
        ]
      : [
          { value: 'query', label: 'Query' },
          { value: 'variables', label: 'Variables' },
          { value: 'headers', label: 'Headers' },
          { value: 'auth', label: 'Auth' }
        ];

  return (
    <div className="w-full h-full flex flex-col gap-10">
      <div className="flex flex-col gap-2 max-w-[400px]">
        <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
          <IconTag size={16} />
          Tags
        </h3>
        <div label="Tags">
          <Tags item={item} collection={collection} />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <ToggleSelector
          checked={encodeUrl}
          onChange={onToggleUrlEncoding}
          label="URL Encoding"
          description="Automatically encode query parameters in the URL"
          size="medium"
        />

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
            <IconLayoutDashboard size={16} />
            Default Tab Panel
          </h3>
          <div className="flex items-center gap-2">
            <TabPanelSelector
              value={effectiveDefaultTabPanel}
              onChange={onChangeDefaultTabPanel}
              options={tabPanelOptions}
            />
            <p className="text-xs text-gray-700 dark:text-gray-400">
              Select the default tab panel to show when opening this request
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
