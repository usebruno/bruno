import React from 'react';
import { useTheme } from 'providers/Theme';

const ColorBadge = ({ color, size = 10 }) => {
  const sizeValue = typeof size === 'string' ? size : `${size}px`;
  const { theme } = useTheme();

  return (
    <div
      className="flex-shrink-0 rounded-full"
      style={{
        width: sizeValue,
        height: sizeValue,
        backgroundColor: color || 'transparent'
      }}
    />
  );
};

export default ColorBadge;
