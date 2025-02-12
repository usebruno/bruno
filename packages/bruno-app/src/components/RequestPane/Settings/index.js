import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { updateRequestSettings } from 'providers/ReduxStore/slices/collections';

const Settings = ({ item, collection }) => {
  const dispatch = useDispatch();

  const displayNames = {
    disableParsingResponseJson: 'Disable Parsing Response Json'
  };

  const defaultSettings = [
    {
      name: 'disableParsingResponseJson',
      value: false,
    },
  ];

  const storedSettings = item.draft
    ? get(item, 'draft.request.settings', [])
    : get(item, 'request.settings', []);

  // Merge default settings with stored settings
  const mergedSettings = useMemo(() => {
    const settingsMap = {};
    defaultSettings.forEach((setting) => {
      settingsMap[setting.name] = { ...setting };
    });

    storedSettings.forEach((setting) => {
      if (settingsMap[setting.name]) {
        settingsMap[setting.name] = {
          ...settingsMap[setting.name],
          ...setting,
        };
      } else {
        settingsMap[setting.name] = setting;
      }
    });

    return Object.values(settingsMap);
  }, [defaultSettings, storedSettings]);

  const handleSettingChange = (settingName, value) => {
    const updatedSettings = mergedSettings.map((setting) => {
      if (setting.name === settingName) {
        return { ...setting, value: value.toString() };
      }
      return setting;
    });

    dispatch(
      updateRequestSettings({
        settings: updatedSettings,
        itemUid: item.uid,
        collectionUid: collection.uid,
      })
    );
  };

  return (
    <div className="flex-1 mt-2">
      {mergedSettings.map((setting) => (
        <tr key={setting.name}>
          <td>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={setting.value == 'true'}
                onChange={(e) =>
                  handleSettingChange(setting.name, e.target.checked)
                }
              />
              <span>{displayNames[setting.name]}</span>
            </label>
          </td>
        </tr>
      ))}
    </div>
  );
};

export default Settings;
