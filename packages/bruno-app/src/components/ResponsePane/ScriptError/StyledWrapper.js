import styled from 'styled-components';

/* Grid rather than flex: grid sizes the list from its rows' content so the response below stays
   visible when the cards don't need the pane, and when it does shrink the list, grid hands the free
   space to the rows equally, capping each at its own content so a short error never grows past
   what it has to show and the remainder flows to the longer cards. */
const StyledWrapper = styled.div`
  display: grid;
  grid-auto-rows: minmax(auto, max-content);
  gap: 0.5rem;
  min-height: 0;
  margin-bottom: 0.5rem;

  .script-error {
    display: flex;
    flex-direction: column;
    min-height: 10rem;
  }

  .script-error-card {
    background-color: ${(props) => props.theme.background.base};
    border: solid 1px ${(props) => props.theme.border.border2};
    border-left: 4px solid ${(props) => props.theme.colors.text.danger};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.75rem 0.75rem 0rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .script-error-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 8rem;
    overflow-y: auto;
    padding-bottom: 0.75rem;
  }

  .script-error.expanded {
    min-height: 0;
  }

  .script-error.expanded .script-error-card {
    flex: 1 1 auto;
    min-height: 0;
  }

  .script-error.expanded .script-error-body {
    flex: 1 1 auto;
    max-height: none;
  }

  .script-error-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .script-error-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .icon-button {
    all: unset;
    opacity: 0.7;
    transition: opacity 0.2s;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }

    svg {
      color: ${(props) => props.theme.text};
    }
  }

  .error-title {
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .script-error-source-label {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    min-width: 0;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .script-error-file-path {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    max-width: 100%;
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.8;
    transition: opacity 0.15s, text-decoration 0.15s;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.navigable {
      cursor: pointer;

      &:hover {
        opacity: 1;
        text-decoration: underline;
      }
    }
  }

  .script-error-message {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.25rem;
    white-space: pre-wrap;
    word-break: break-all;
    color: ${(props) => props.theme.colors.text.danger};
    font-weight: 500;
  }

  .script-error-stack-toggle {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .script-error-stack {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.muted};
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    padding: 0.25rem 0;
  }
`;

export default StyledWrapper;
