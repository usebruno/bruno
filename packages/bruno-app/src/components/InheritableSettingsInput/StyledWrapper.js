import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-text-input {
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    outline: none;
    transition: border-color ease-in-out 0.1s;

    &:focus,
    &:focus-visible {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }
`;

export default StyledWrapper;
