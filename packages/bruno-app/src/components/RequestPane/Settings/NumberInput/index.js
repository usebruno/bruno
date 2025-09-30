import React from 'react';

const NumberInput = ({
  id,
  label,
  value,
  onChange,
  placeholder = '0',
  min = 0,
  max = 999999,
  className = ''
}) => {
  const handleChange = (e) => {
    const inputValue = e.target.value;
    const numericValue = inputValue ? parseInt(inputValue, 10) : null;
    onChange(numericValue);
  };

  return (
    <div className="flex items-center justify-between">
      <label className="settings-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className={`block textbox ${className}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        placeholder={placeholder}
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default NumberInput;
