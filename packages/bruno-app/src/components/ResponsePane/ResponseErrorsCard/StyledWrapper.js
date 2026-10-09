import styled from 'styled-components';
import { mix } from 'polished';

const StyledWrapper = styled.div`
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: ${(props) => props.theme.background.base};
  border: 1px solid ${(props) => props.theme.border.subtle};
  border-radius: ${(props) => props.theme.border.radius.base};

  &.full-pane {
    flex-grow: 1;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    height: 2.375rem;
    padding: 0 0.5rem 0 0.75rem;
  }

  .card-title-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .card-title {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .card-actions {
    display: flex;
    gap: 0.125rem;
    flex-shrink: 0;
    margin-left: auto;
  }

  .card-body {
    min-height: 0;
    max-height: 10rem;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }

  &.full-pane .card-body {
    max-height: none;
  }

  .error-row-line {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    min-height: 1.875rem;
    border-top: 1px solid ${(props) => props.theme.border.border0};
    /* 5px is the .scrollbar-hover gutter, so row actions line up with the header's */
    padding-right: calc(0.5rem - 5px);
    background-color: ${(props) => props.theme.background.base};

    &:hover {
      background-color: ${(props) => mix(0.04, props.theme.text, props.theme.background.base)};
    }
  }

  .error-row.expanded > .error-row-line {
    background-color: ${(props) => mix(0.06, props.theme.text, props.theme.background.base)};
  }

  .error-row-toggle {
    all: unset;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3125rem 0.5rem 0.3125rem 0.75rem;
    cursor: pointer;

    &:focus-visible {
      outline: 1px solid ${(props) => props.theme.input.focusBorder};
      outline-offset: -1px;
    }
  }

  .error-row-chevron {
    display: inline-flex;
    justify-content: center;
    width: 1rem;
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error-row-label {
    flex-shrink: 0;
    font-weight: 500;
    white-space: nowrap;
  }

  .error-row-preview {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.125rem 0.75rem 0.75rem;
  }

  .error-row .error-details {
    padding: 0.625rem 0.75rem 0.625rem 2.25rem;
  }

  .error-source {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.5rem;
    white-space: nowrap;
  }

  .error-source-label {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error-file-path {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.navigable {
      &:hover {
        color: ${(props) => props.theme.text};
        text-decoration: underline;
      }
    }
  }

  .error-message {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    white-space: pre-wrap;
    word-break: break-word;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .error-stack-trace-toggle {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;

    &:hover {
      color: ${(props) => props.theme.text};
    }

    &:focus-visible {
      outline: 1px solid ${(props) => props.theme.input.focusBorder};
      outline-offset: 2px;
    }
  }

  .error-stack-trace {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-all;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
