import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  min-width: 0;

  .value-content {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    height: 100%;
  }

  .value-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    text-align: left;
    line-height: 33px;
  }

  .var-ref {
    cursor: default;
  }

  .var-ref-valid {
    color: ${(props) => props.theme.codemirror.variable.valid};
  }

  .var-ref-invalid {
    color: ${(props) => props.theme.codemirror.variable.invalid};
  }

  .var-ref-prompt {
    color: ${(props) => props.theme.codemirror.variable.prompt};
  }

  .object-preview {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    font: inherit;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    line-height: 33px;

    &:hover {
      color: ${(props) => props.theme.colors?.text?.link || props.theme.primary?.strong || '#546de5'};
      text-decoration: underline;
    }

    &.is-selected {
      color: ${(props) => props.theme.colors?.text?.link || props.theme.primary?.strong || '#546de5'};
      font-weight: 500;
    }
  }

  .row-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 2px;
  }

  .row-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    margin: 0;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    border-radius: 4px;
    line-height: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;

    &.is-pinned {
      opacity: 1;
      pointer-events: auto;
    }

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.sidebar?.bg || 'transparent'};
    }

    &.copied {
      color: #22c55e;
    }
  }
`;

export default StyledWrapper;
