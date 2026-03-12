import React from 'react';
import { useTheme } from 'styled-components';
import { IconAlertTriangle } from '@tabler/icons';
import DotIcon from 'components/Icons/Dot';

const StatusDot = ({ type = 'default' }) => {
  const theme = useTheme();

  if (type === 'warning') {
    return (
      <span className="ml-1 inline-flex items-center opacity-80" style={{ color: theme.colors.text.warning }}>
        <IconAlertTriangle size={12} strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <sup
      className={`ml-[.125rem] opacity-80 font-medium ${
        type === 'error' ? 'text-red-500' : ''
      }`}
    >
      <DotIcon width="10" />
    </sup>
  );
};

export default StatusDot;
