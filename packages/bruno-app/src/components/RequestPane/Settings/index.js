import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { IconTag } from '@tabler/icons';
import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
import NumberInput from 'components/RequestPane/Settings/NumberInput';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
import Tags from './Tags/index';
import StyledWrapper from './StyledWrapper';

const Settings = ({ item, collection }) => {
  const dispatch = useDispatch();

  // get the length of active params, headers, asserts and vars as well as the contents of the body, tests and script
  const getPropertyFromDraftOrRequest = (propertyKey) =>
    item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

  const { encodeUrl, followRedirects = true, maxRedirects = 5, timeout = 0 } = getPropertyFromDraftOrRequest('settings');

  // Reusable function to update settings
  const updateSetting = useCallback((settingUpdate) => {
    dispatch(updateItemSettings({
      collectionUid: collection.uid,
      itemUid: item.uid,
      settings: settingUpdate
    }));
  }, [dispatch, collection.uid, item.uid]);

  const onToggleUrlEncoding = useCallback(() => {
    updateSetting({ encodeUrl: !encodeUrl });
  }, [encodeUrl, updateSetting]);

  const onToggleFollowRedirects = useCallback(() => {
    updateSetting({ followRedirects: !followRedirects });
  }, [followRedirects, updateSetting]);

  const onMaxRedirectsChange = useCallback((value) => {
    updateSetting({ maxRedirects: value });
  }, [updateSetting]);

  const onTimeoutChange = useCallback((value) => {
    updateSetting({ timeout: value });
  }, [updateSetting]);

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Configure request settings for this item.</div>
      <div className="bruno-form">
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 mb-4">
            <IconTag size={16} />
            Tags
          </h3>
          <Tags item={item} collection={collection} />
        </div>

        <div className="flex flex-col gap-4">

          <div className="flex flex-col gap-4">
            <ToggleSelector
              checked={encodeUrl}
              onChange={onToggleUrlEncoding}
              label="URL Encoding"
              description="Automatically encode query parameters in the URL"
              size="medium"
            />
          </div>

          <div className="flex flex-col gap-4">
            <ToggleSelector
              checked={followRedirects}
              onChange={onToggleFollowRedirects}
              label="Automatically Follow Redirects"
              description="Follow HTTP redirects automatically"
              size="medium"
            />
          </div>

          <NumberInput
            id="maxRedirects"
            label="Max Redirects"
            value={maxRedirects}
            onChange={onMaxRedirectsChange}
            placeholder="5"
            min={0}
            max={50}
          />

          <NumberInput
            id="timeout"
            label="Timeout (ms)"
            value={timeout}
            onChange={onTimeoutChange}
            placeholder="0"
            min={0}
            max={300000}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Settings;