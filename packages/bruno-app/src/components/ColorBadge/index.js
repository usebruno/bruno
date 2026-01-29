import React from 'react';
import { useTheme } from 'providers/Theme';

const ColorBadge = ({ color, size = 10, showEmptyBorder = true }) => {
  const sizeValue = typeof size === 'string' ? size : `${size}px`;
  const { theme } = useTheme();

  const showBorder = !color && showEmptyBorder;

  return (
    <div
      className="flex-shrink-0 rounded-full"
      style={{
        width: sizeValue,
        height: sizeValue,
        backgroundColor: color || 'transparent',
        border: showBorder ? '1px solid' : 'none',
        borderColor: showBorder ? theme.background.surface1 : 'transparent'
      }}
    />
  );
};

export default ColorBadge;
