import styled from 'styled-components';

const StyledWrapper = styled.div`
  .inheritable-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .inheritable-tag {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 6px;
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: 4px;
    font-size: 11px;
    font-weight: 400;
    line-height: 1;
    color: ${(props) => props.theme.colors.text.subtext2};
  }

  .inheritable-control {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .settings-text-input {
    border-radius: ${(props) => props.theme.border.radius.sm};
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

  .inheritable-input {
    &::placeholder {
      color: ${(props) => props.theme.colors.text.subtext2};
      opacity: 1;
    }
  }

  .inheritable-status {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    white-space: nowrap;
    font-size: 12px;
    line-height: 16px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  /* The source reads as "go to it", not as an action: grey and underlined, unlike the blue links */
  .inheritable-source {
    padding: 0;
    border: none;
    background: none;
    font-size: 12px;
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.textLink};
      outline-offset: 2px;
      border-radius: 2px;
    }
  }

  .inheritable-separator {
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .inheritable-link {
    padding: 0;
    border: none;
    background: none;
    font-size: 12px;
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.textLink};
      outline-offset: 2px;
      border-radius: 2px;
    }
  }
`;

export default StyledWrapper;
