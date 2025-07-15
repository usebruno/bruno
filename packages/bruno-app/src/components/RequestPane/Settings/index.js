import React, { useCallback } from 'react';
 import { useDispatch } from 'react-redux';
 import get from 'lodash/get';
 import { IconTag } from '@tabler/icons';
 import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
 import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
 import Tags from './Tags/index';

 const Settings = ({ item, collection }) => {
   const dispatch = useDispatch();

  // get the length of active params, headers, asserts and vars as well as the contents of the body, tests and script
  const getPropertyFromDraftOrRequest = (propertyKey) =>
    item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

  const { encodeUrl } = getPropertyFromDraftOrRequest('settings');
  
  const onToggleUrlEncoding = useCallback(() => {
    dispatch(updateItemSettings({
      collectionUid: collection.uid,
      itemUid: item.uid,
      settings: { encodeUrl: !encodeUrl }
    }));
   }, [encodeUrl, dispatch, collection.uid, item.uid]);

  return (
    <div className="w-full h-full flex flex-col gap-10">
      <div className='flex flex-col gap-2 max-w-[400px]'>
        <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
          <IconTag size={16} />
          Tags
        </h3>
        <div label="Tags">
          <Tags item={item} collection={collection} />
        </div>
      </div>
      <div className='flex flex-col gap-4'>
        <ToggleSelector
          checked={encodeUrl}
          onChange={onToggleUrlEncoding}
          label="URL Encoding"
          description="Automatically encode query parameters in the URL"
          size="medium"
        />
      </div>
    </div>
   );
 };

 export default Settings;