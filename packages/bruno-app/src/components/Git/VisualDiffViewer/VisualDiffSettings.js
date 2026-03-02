import React, { useMemo } from 'react';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';

const SETTINGS_LABELS = {
  encodeUrl: 'Encode URL',
  timeout: 'Timeout (ms)',
  followRedirects: 'Follow Redirects',
  maxRedirects: 'Max Redirects',
  keepAliveInterval: 'Keep Alive Interval'
};

const VisualDiffSettings = ({ oldData, newData, showSide }) => {
  const oldSettings = get(oldData, 'settings', {});
  const newSettings = get(newData, 'settings', {});

  const currentSettings = showSide === 'old' ? oldSettings : newSettings;
  const otherSettings = showSide === 'old' ? newSettings : oldSettings;

  const settingsFields = useMemo(() => {
    const allKeys = new Set([...Object.keys(currentSettings), ...Object.keys(otherSettings)]);
    const fields = [];

    allKeys.forEach((key) => {
      const currentValue = currentSettings[key];
      const otherValue = otherSettings[key];

      if (currentValue === undefined && otherValue === undefined) return;
      if (isEqual(currentValue, otherValue)) return;

      let status = 'unchanged';
      if (otherValue === undefined) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (!isEqual(currentValue, otherValue)) {
        status = 'modified';
      }

      let displayValue = currentValue;
      if (typeof displayValue === 'boolean') {
        displayValue = displayValue ? 'true' : 'false';
      } else if (displayValue === undefined || displayValue === null) {
        displayValue = '';
      } else if (displayValue === 'inherit') {
        displayValue = 'inherit (from collection)';
      }

      fields.push({
        key: SETTINGS_LABELS[key] || key,
        value: String(displayValue),
        status
      });
    });

    return fields;
  }, [currentSettings, otherSettings, showSide]);

  if (settingsFields.length === 0) {
    return null;
  }

  return (
    <div className="diff-section">
      <table className="diff-table">
        <thead>
          <tr>
            <th style={{ width: '30px' }}></th>
            <th style={{ width: '40%' }}>Setting</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {settingsFields.map((field, index) => (
            <tr key={index} className={field.status}>
              <td>
                {field.status !== 'unchanged' && (
                  <span className={`status-badge ${field.status}`}>
                    {field.status === 'added' ? 'A' : field.status === 'deleted' ? 'D' : 'M'}
                  </span>
                )}
              </td>
              <td className="key-cell">{field.key}</td>
              <td className="value-cell">{field.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VisualDiffSettings;
