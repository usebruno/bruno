import styled from 'styled-components';

const StyledWrapper = styled.div`
  .hue-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 2px;
    outline: none;
  }

  .hue-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${(props) => props.color ?? props.theme.bg};
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.1s ease;
  }

  .hue-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .hue-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${(props) => props.color ?? props.theme.bg};
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.1s ease;
  }

  .hue-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }
`;

export default StyledWrapper;
