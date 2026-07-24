import React from 'react';
import { IconAlertTriangle, IconAlertCircle, IconCode } from '@tabler/icons';

const LogIcon = ({ type }) => {
  const iconProps = { size: 16, strokeWidth: 1.5 };

  switch (type) {
    case 'error':
      return <IconAlertCircle className="log-icon error" {...iconProps} />;
    case 'warn':
      return <IconAlertTriangle className="log-icon warn" {...iconProps} />;
    case 'info':
      return <IconAlertTriangle className="log-icon info" {...iconProps} />;
    // case 'debug':
    //   return <IconBug className="log-icon debug" {...iconProps} />;
    default:
      return <IconCode className="log-icon log" {...iconProps} />;
  }
};

export default LogIcon;
