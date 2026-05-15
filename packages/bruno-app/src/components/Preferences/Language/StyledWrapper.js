import styled from 'styled-components';

const StyledWrapper = styled.div`
  .section-header {
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .textbox {
    padding: 0.5rem 0.75rem;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 0.375rem;
    background-color: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    font-size: 0.875rem;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }
`;

export default StyledWrapper;
