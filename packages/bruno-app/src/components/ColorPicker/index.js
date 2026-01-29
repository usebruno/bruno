import React, { useState, useEffect, useRef } from 'react';
import { IconBan, IconBrush } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import ColorBadge from 'components/ColorBadge';
import StyledWrapper from './StyledWrapper';

const PRESET_COLORS = [
  '#CE4F3B',
  '#2E8A54',
  '#346AB2',
  '#C77A0F',
  '#B83D7F',
  '#8D44B2'
];

const GRADIENT_COLORS = ['#D85D43', '#F4BB74', '#61DCB1', '#7EBDF2', '#D48ADE', '#B491E5'];

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r, g, b) => {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
};

const interpolateColor = (position) => {
  const numColors = GRADIENT_COLORS.length;
  const scaledPos = (position / 100) * (numColors - 1);
  const index = Math.floor(scaledPos);
  const fraction = scaledPos - index;

  if (index >= numColors - 1) {
    return GRADIENT_COLORS[numColors - 1];
  }

  const color1 = hexToRgb(GRADIENT_COLORS[index]);
  const color2 = hexToRgb(GRADIENT_COLORS[index + 1]);

  const r = color1.r + (color2.r - color1.r) * fraction;
  const g = color1.g + (color2.g - color1.g) * fraction;
  const b = color1.b + (color2.b - color1.b) * fraction;

  return rgbToHex(r, g, b);
};

const findClosestPosition = (hex) => {
  if (!hex) return 0;
  const target = hexToRgb(hex);
  let closestPos = 0;
  let minDistance = Infinity;

  for (let pos = 0; pos <= 100; pos++) {
    const color = hexToRgb(interpolateColor(pos));
    const distance = Math.sqrt(
      Math.pow(target.r - color.r, 2) + Math.pow(target.g - color.g, 2) + Math.pow(target.b - color.b, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestPos = pos;
    }
  }
  return closestPos;
};

const ColorPickerIcon = ({ color }) => {
  if (color) {
    return <ColorBadge color={color} size={8} />;
  }
  return <IconBrush size={14} strokeWidth={1.5} className="opacity-70" />;
};

const ColorPicker = ({ color, onChange, icon }) => {
  const [sliderPosition, setSliderPosition] = useState(() =>
    color && !PRESET_COLORS.includes(color) ? findClosestPosition(color) : 0
  );
  const [customColor, setCustomColor] = useState(() =>
    color && !PRESET_COLORS.includes(color) ? color : GRADIENT_COLORS[0]
  );
  const pendingColorRef = useRef(customColor);

  useEffect(() => {
    if (color && !PRESET_COLORS.includes(color)) {
      setSliderPosition(findClosestPosition(color));
      setCustomColor(color);
      pendingColorRef.current = color;
    }
  }, [color]);

  const handleColorSelect = (selectedColor) => {
    onChange(selectedColor);
  };

  const handleSliderChange = (e) => {
    const newPosition = parseInt(e.target.value, 10);
    setSliderPosition(newPosition);
    const newColor = interpolateColor(newPosition);
    setCustomColor(newColor);
    pendingColorRef.current = newColor;
  };

  const handleSliderEnd = () => {
    onChange(pendingColorRef.current);
  };

  const defaultIcon = (
    <div className="cursor-pointer flex items-center" title="Change color">
      <ColorPickerIcon color={color} />
    </div>
  );

  const colorPickerContent = (
    <StyledWrapper>
      <div className="p-2">
        <div className="flex flex-wrap gap-1.5 justify-between items-center">
          <div
            className="w-5 h-5 cursor-pointer flex items-center justify-center transition-transform duration-100 hover:scale-110"
            onClick={() => handleColorSelect(null)}
            title="No color"
          >
            <IconBan size={20} strokeWidth={1.5} />
          </div>
          {PRESET_COLORS.map((presetColor, index) => (
            <div
              key={index}
              className={`w-5 h-5 rounded cursor-pointer flex items-center justify-center transition-transform duration-100 hover:scale-110 border-2 border-transparent
                ${color === presetColor ? 'border-solid !border-current' : ''}
              `}
              style={{ backgroundColor: presetColor }}
              onClick={() => handleColorSelect(presetColor)}
              title={presetColor}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2 pt-2">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 cursor-pointer"
            style={{ backgroundColor: customColor }}
            onClick={() => handleColorSelect(customColor)}
            title="Custom color"
          />
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={handleSliderChange}
            onMouseUp={handleSliderEnd}
            onTouchEnd={handleSliderEnd}
            className="hue-slider flex-1"
            style={{
              '--thumb-color': customColor,
              'background': `linear-gradient(to right, #D85D43, #F4BB74, #61DCB1, #7EBDF2, #D48ADE, #B491E5)`
            }}
            title="Adjust color"
          />
        </div>
      </div>
    </StyledWrapper>
  );

  return (
    <Dropdown icon={icon || defaultIcon} placement="bottom-start">
      {colorPickerContent}
    </Dropdown>
  );
};

export default ColorPicker;
