import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconEye, IconEyeOff } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const MqttAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <StyledWrapper className="flex flex-col gap-6 pt-2 px-1 overflow-auto">
      <section>
        <h3 className="section-title text-xs font-semibold uppercase mb-3">Connection</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Client ID</label>
            <input
              className="w-full px-2 py-1.5 text-sm border rounded outline-none"
              type="text"
              value={settings?.clientId || ''}
              onChange={(e) => updateSettings({ clientId: e.target.value })}
              placeholder="Auto-generated if empty"
              data-testid="mqtt-auth-client-id"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Username</label>
            <input
              className="w-full px-2 py-1.5 text-sm border rounded outline-none"
              type="text"
              value={settings?.username || ''}
              onChange={(e) => updateSettings({ username: e.target.value })}
              placeholder="Optional"
              data-testid="mqtt-auth-username"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">Password</label>
            <div className="relative">
              <input
                className="w-full px-2 py-1.5 pr-8 text-sm border rounded outline-none"
                type={showPassword ? 'text' : 'password'}
                value={settings?.password || ''}
                onChange={(e) => updateSettings({ password: e.target.value })}
                placeholder="Optional"
                data-testid="mqtt-auth-password"
              />
              <button
                type="button"
                className="password-toggle absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
        </div>
      </section>
    </StyledWrapper>
  );
};

export default MqttAuth;
