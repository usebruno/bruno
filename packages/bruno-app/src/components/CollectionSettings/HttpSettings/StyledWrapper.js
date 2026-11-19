import styled from 'styled-components';

const StyledWrapper = styled.div`
  .http-settings {
    max-width: 500px;
    font-size: ${(props) => props.theme.font.size.base};
  }

  .http-version-dropdown {
    width: 200px;
  }

  .http-version-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: border-color ease-in-out 0.1s;

    &:hover,
    &:focus-visible {
      border-color: ${(props) => props.theme.input.focusBorder};
      outline: none;
    }

    .caret {
      color: ${(props) => props.theme.colors.text.muted};
      flex-shrink: 0;
    }
  }
`;

export default StyledWrapper;
