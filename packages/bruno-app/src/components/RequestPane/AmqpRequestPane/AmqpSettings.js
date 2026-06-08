import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';

const AmqpSettings = ({ item, collection }) => {
  const dispatch = useDispatch();
  const settings = item.draft?.settings?.settings || item.settings?.settings || {};
  const timeout = settings.timeout || 5000;
  const heartbeat = settings.heartbeat || 0;
  const prefetch = settings.prefetch || 0;
  const vhost = settings.vhost || '/';

  const handleSettingChange = (field, value) => {
    dispatch({
      type: 'collections/updateAmqpSettings',
      payload: {
        itemUid: item.uid,
        collectionUid: collection.uid,
        field,
        value
      }
    });
  };

  return (
    <div className="px-4 w-full">
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Timeout (ms)</label>
          <input
            type="number"
            className="w-full px-2 py-1 text-sm border rounded"
            value={timeout}
            onChange={(e) => handleSettingChange('timeout', parseInt(e.target.value) || 5000)}
            placeholder="5000"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Heartbeat (seconds)</label>
          <input
            type="number"
            className="w-full px-2 py-1 text-sm border rounded"
            value={heartbeat}
            onChange={(e) => handleSettingChange('heartbeat', parseInt(e.target.value) || 0)}
            placeholder="0 (server default)"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Prefetch Count</label>
          <input
            type="number"
            className="w-full px-2 py-1 text-sm border rounded"
            value={prefetch}
            onChange={(e) => handleSettingChange('prefetch', parseInt(e.target.value) || 0)}
            placeholder="0 (no limit)"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Virtual Host</label>
          <input
            type="text"
            className="w-full px-2 py-1 text-sm border rounded"
            value={vhost}
            onChange={(e) => handleSettingChange('vhost', e.target.value || '/')}
            placeholder="/"
          />
        </div>
      </div>
    </div>
  );
};

export default AmqpSettings;
