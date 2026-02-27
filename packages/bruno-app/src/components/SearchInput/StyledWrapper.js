import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;

  .search-icon {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .close-icon {
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  input#search-input {
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }
  }
`;

export default StyledWrapper;
