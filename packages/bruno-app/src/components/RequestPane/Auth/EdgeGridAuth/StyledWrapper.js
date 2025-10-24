import styled from 'styled-components';

const StyledWrapper = styled.div`
  label {
    font-size: 0.8125rem;
  }

  .single-line-editor-wrapper {
    padding: 0.5rem 0;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};

    &:focus-within {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
    }
  }
`;

export default StyledWrapper;
