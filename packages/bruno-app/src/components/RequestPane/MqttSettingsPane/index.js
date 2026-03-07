import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import FilePickerEditor from 'components/FilePickerEditor';
import StyledWrapper from './StyledWrapper';

const MqttSettingsPane = ({ item, collection }) => {
  const dispatch = useDispatch();

  const settings = item.draft
    ? item.draft.request?.settings
    : item.request?.settings;

  const updateSettings = useCallback((updates) => {
    const currentSettings = item.draft ? item.draft.request?.settings : item.request?.settings;
    const newSettings = { ...currentSettings, ...updates };
    dispatch(updateRequestBody({
      content: newSettings,
      itemUid: item.uid,
      collectionUid: collection.uid,
      contentType: 'mqtt-settings'
    }));
  }, [dispatch, item, collection.uid]);

  const updateSsl = useCallback((updates) => {
    updateSettings({ ssl: { ...settings?.ssl, ...updates } });
  }, [settings, updateSettings]);

  const updateV5Properties = useCallback((updates) => {
    const current = settings?.v5Properties || {};
    updateSettings({ v5Properties: { ...current, ...updates } });
  }, [settings, updateSettings]);

  const isMqtt5 = settings?.mqttVersion === '5.0';

  return (
    <StyledWrapper className="flex flex-col gap-6 pt-2 px-1 overflow-auto">
      {/* Protocol */}
      <section>
        <h3 className="section-title text-xs font-semibold uppercase mb-3">Protocol</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">MQTT Version</label>
            <select
              className="w-full px-2 py-1.5 text-sm border rounded outline-none"
              value={settings?.mqttVersion || '5.0'}
              onChange={(e) => updateSettings({ mqttVersion: e.target.value })}
            >
              <option value="3.1.1">3.1.1</option>
              <option value="5.0">5.0</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Keep Alive (seconds)</label>
            <input
              className="w-full px-2 py-1.5 text-sm border rounded outline-none"
              type="number"
              min="0"
              value={settings?.keepAlive ?? 60}
              onChange={(e) => updateSettings({ keepAlive: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Connect Timeout (ms)</label>
            <input
              className="w-full px-2 py-1.5 text-sm border rounded outline-none"
              type="number"
              min="0"
              value={settings?.connectTimeout ?? 30000}
              onChange={(e) => updateSettings({ connectTimeout: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.cleanSession ?? true}
                onChange={(e) => updateSettings({ cleanSession: e.target.checked })}
              />
              Clean Session
            </label>
          </div>
        </div>
      </section>

      {/* TLS / Certificates */}
      <section>
        <h3 className="section-title text-xs font-semibold uppercase mb-3">TLS / Certificates</h3>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.ssl?.enabled ?? false}
              onChange={(e) => updateSsl({ enabled: e.target.checked })}
            />
            Enable SSL/TLS
          </label>
          {settings?.ssl?.enabled && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.ssl?.rejectUnauthorized ?? true}
                  onChange={(e) => updateSsl({ rejectUnauthorized: e.target.checked })}
                />
                Validate server certificate
              </label>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">CA Certificate</label>
                  <FilePickerEditor
                    value={settings?.ssl?.caCert || ''}
                    onChange={(filePath) => updateSsl({ caCert: filePath })}
                    collection={collection}
                    isSingleFilePicker={true}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Client Certificate</label>
                  <FilePickerEditor
                    value={settings?.ssl?.clientCert || ''}
                    onChange={(filePath) => updateSsl({ clientCert: filePath })}
                    collection={collection}
                    isSingleFilePicker={true}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Client Key</label>
                  <FilePickerEditor
                    value={settings?.ssl?.clientKey || ''}
                    onChange={(filePath) => updateSsl({ clientKey: filePath })}
                    collection={collection}
                    isSingleFilePicker={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MQTT 5.0 Properties */}
      {isMqtt5 && (
        <section>
          <h3 className="section-title text-xs font-semibold uppercase mb-3">MQTT 5.0 Properties</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Session Expiry Interval</label>
              <input
                className="w-full px-2 py-1.5 text-sm border rounded outline-none"
                type="number"
                min="0"
                value={settings?.v5Properties?.sessionExpiryInterval ?? ''}
                onChange={(e) => updateV5Properties({ sessionExpiryInterval: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Receive Maximum</label>
              <input
                className="w-full px-2 py-1.5 text-sm border rounded outline-none"
                type="number"
                min="1"
                value={settings?.v5Properties?.receiveMaximum ?? ''}
                onChange={(e) => updateV5Properties({ receiveMaximum: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Default"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Maximum Packet Size</label>
              <input
                className="w-full px-2 py-1.5 text-sm border rounded outline-none"
                type="number"
                min="1"
                value={settings?.v5Properties?.maximumPacketSize ?? ''}
                onChange={(e) => updateV5Properties({ maximumPacketSize: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Default"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Topic Alias Maximum</label>
              <input
                className="w-full px-2 py-1.5 text-sm border rounded outline-none"
                type="number"
                min="0"
                value={settings?.v5Properties?.topicAliasMaximum ?? ''}
                onChange={(e) => updateV5Properties({ topicAliasMaximum: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Default"
              />
            </div>
          </div>
        </section>
      )}
    </StyledWrapper>
  );
};

export default MqttSettingsPane;
