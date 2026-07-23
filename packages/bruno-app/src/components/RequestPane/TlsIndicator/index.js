import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconLock, IconLockOpen } from '@tabler/icons';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { useTheme } from 'providers/Theme';
import ToolHint from 'components/ToolHint';

const TlsIndicator = ({ size = 20 }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences) || {};
  const sslVerification = preferences?.request?.sslVerification !== false;

  const handleToggle = (e) => {
    e.stopPropagation();
    const next = !sslVerification;
    dispatch(
      savePreferences({
        ...preferences,
        request: {
          ...(preferences.request || {}),
          sslVerification: next
        }
      })
    );
  };

  const Icon = sslVerification ? IconLock : IconLockOpen;
  const tooltipText = sslVerification
    ? 'SSL/TLS verification enabled — click to disable (applies to all requests)'
    : 'SSL/TLS verification disabled — click to enable (applies to all requests)';

  return (
    <ToolHint text={tooltipText} toolhintId="tls-indicator" place="top" positionStrategy="fixed">
      <div className="flex items-center cursor-pointer" onClick={handleToggle} data-testid="tls-indicator">
        <Icon
          color={theme.requestTabs.icon.color}
          strokeWidth={1.5}
          size={size}
          style={{ opacity: sslVerification ? 1 : 0.55 }}
        />
      </div>
    </ToolHint>
  );
};

export default TlsIndicator;
