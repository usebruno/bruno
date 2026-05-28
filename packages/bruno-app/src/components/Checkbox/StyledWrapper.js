import styled from 'styled-components';

const StyledWrapper = styled.div`
  .checkbox-container {
    width: 1rem;
    height: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    cursor: pointer;
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  .checkbox-checkmark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    visibility: ${(props) => props.checked ? 'visible' : 'hidden'};
    pointer-events: none;
  }

  .checkbox-input {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    width: 1rem;
    height: 1rem;
    border: 2px solid ${(props) => {
      if (props.checked && props.disabled) {
        return props.theme.colors.text.muted;
      }

      if (props.checked && !props.disabled) {
        return props.theme.colors.text.yellow;
      }

      return props.theme.colors.text.muted;
    }};
    border-radius: 4px;
    background-color: ${(props) => {
      if (props.checked && !props.disabled) {
        return props.theme.colors.text.yellow;
      }

      if (props.checked && props.disabled) {
        return props.theme.colors.text.muted;
      }

      return 'transparent';
    }};
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    outline: none;
    box-shadow: none;
    
    &:hover:not(:disabled) {
      opacity: 0.8;
    }
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    
    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px ${(props) => props.theme.colors.text.yellow}40;
    }
  }
`;

export default StyledWrapper;
