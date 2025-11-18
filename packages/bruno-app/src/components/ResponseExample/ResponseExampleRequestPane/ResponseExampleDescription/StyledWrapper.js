import styled from 'styled-components';

const StyledWrapper = styled.div`
  textarea {
    background-color: transparent;
    color: ${(props) => props.theme.text};
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    border: 1px solid transparent;
    padding: 0;
    
    &:not([readonly]) {
      border: 1px solid ${(props) => props.theme.input.border};
      padding: 8px;
    }
    
    &:focus {
      outline: none;
      box-shadow: none;
      border: 1px solid ${(props) => props.theme.examples.urlBar.border};
    }
    
    &:disabled {
      background: transparent;
      color: ${(props) => props.theme.colors.text.muted};
      cursor: not-allowed;
      box-shadow: none;
    }
    
    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }
  }
`;

export default StyledWrapper;
