import React from 'react';

const ThemeSelects = ({ value, onChange }) => {
  return (
    <div className="flex items-center mb-4">
      <input
        id="light-theme"
        className="cursor-pointer"
        type="radio"
        name="theme"
        onChange={() => {
          onChange('light');
        }}
        value="light"
        checked={value === 'light'}
      />
      <label htmlFor="light-theme" className="ml-1 cursor-pointer select-none">
        Light
      </label>

      <input
        id="dark-theme"
        className="ml-4 cursor-pointer"
        type="radio"
        name="theme"
        onChange={() => {
          onChange('dark');
        }}
        value="dark"
        checked={value === 'dark'}
      />
      <label htmlFor="dark-theme" className="ml-1 cursor-pointer select-none">
        Dark
      </label>

      <input
        id="system-theme"
        className="ml-4 cursor-pointer"
        type="radio"
        name="theme"
        onChange={() => {
          onChange('system');
        }}
        value="system"
        checked={value === 'system'}
      />
      <label htmlFor="system-theme" className="ml-1 cursor-pointer select-none">
        System
      </label>
    </div>
  );
};

export default ThemeSelects;
