import React from 'react';
import { useDispatch } from 'react-redux';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';

const AmqpSettings = ({ item, collection }) => {
  const dispatch = useDispatch();
  const settings = item.draft?.settings?.settings ?? item.settings?.settings ?? {};
  const timeout = settings.timeout ?? 5000;
  const heartbeat = settings.heartbeat ?? 0;
  const prefetch = settings.prefetch ?? 0;
  const vhost = settings.vhost ?? '/';

  const handleSettingChange = (field, value) => {
    const current = item.draft?.settings?.settings ?? item.settings?.settings ?? {};
    dispatch(
      updateItemSettings({
        itemUid: item.uid,
        collectionUid: collection.uid,
        settings: {
          settings: {
            ...current,
            [field]: value
          }
        }
      })
    );
  };

  return (
    <div className="px-4 w-full">
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Timeout (ms)</label>
          <input
            type="number"
            data-testid="amqp-settings-timeout-input"
            className="w-full px-2 py-1 text-sm border rounded"
            value={timeout}
            onChange={(e) => handleSettingChange('timeout', parseInt(e.target.value) || 0)}
            placeholder="5000"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Heartbeat (seconds)</label>
          <input
            type="number"
            data-testid="amqp-settings-heartbeat-input"
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
            data-testid="amqp-settings-prefetch-input"
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
            data-testid="amqp-settings-vhost-input"
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
