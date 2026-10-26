import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs {
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;

    .tab {
      padding: 6px 0;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.subtext0};
      cursor: pointer;
      white-space: nowrap;

      &:hover {
        color: ${(props) => props.theme.tabs.active.color};
      }

      &.active {
        font-weight: ${(props) => props.theme.tabs.active.fontWeight};
        color: ${(props) => props.theme.tabs.active.color};
        border-bottom-color: ${(props) => props.theme.tabs.active.border};
      }
    }
  }

  .source-row {
    display: flex;
    gap: 0.375rem;
    align-items: center;
  }

  .source-input {
    flex: 1;
    min-width: 0;
    height: 1.75rem;
    padding: 0.375rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:disabled {
      cursor: not-allowed;
      color: ${(props) => props.theme.colors.text.muted};
    }

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }
  }

  .source-input.text-centered {
    padding-top: 0;
    padding-bottom: 0;
  }

  .source-input.with-caret {
    padding-right: 1.75rem;
  }

  &.settings .source-input {
    height: auto;
    padding-top: 7px;
    padding-bottom: 7px;
    padding-left: 10px;
    font-size: ${(props) => props.theme.font.size.sm};
    font-family: monospace;
    border-color: ${(props) => props.theme.border.border1};
    border-radius: 5px;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }
`;

export default StyledWrapper;
