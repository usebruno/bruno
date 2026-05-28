import styled from 'styled-components';

const StyledWrapper = styled.div`
  .radio-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .radio-input {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    width: 16px;
    height: 16px;
    border: 2px solid ${(props) => props.theme.colors.text.muted};
    border-radius: 50%;
    background-color: transparent;
    cursor: pointer;
    position: relative;
    outline: none;
    box-shadow: none;
    margin: 0;
    
    &:checked {
      border-color: ${(props) => props.theme.colors.text.yellow};
      background-color: transparent;
      
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background-color: ${(props) => props.theme.colors.text.yellow};
      }
    }
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
      border-color: ${(props) => props.theme.colors.text.muted};
      background-color: transparent;
      
      &:checked {
        border-color: ${(props) => props.theme.colors.text.muted};
        
        &::after {
          background-color: ${(props) => props.theme.colors.text.muted};
        }
      }
    }
    
    &:hover:not(:disabled) {
      opacity: 0.8;
    }
  }

  .radio-label {
    position: absolute;
    top: 0;
    left: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
    pointer-events: none;
  }
`;

export default StyledWrapper;
