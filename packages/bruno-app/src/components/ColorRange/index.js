import StyledWrapper from './StyledWrapper';

const ColorRangePicker = ({ selectedColor, className, value, onChange, colorRange, ...props }) => {
  return (
    <StyledWrapper color={selectedColor}>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={onChange}
        className={`hue-slider ${className}`}
        style={{
          background: `linear-gradient(to right, ${colorRange.join(',')})`
        }}
        title="Adjust color"
        {...props}
      />
    </StyledWrapper>
  );
};

export default ColorRangePicker;
