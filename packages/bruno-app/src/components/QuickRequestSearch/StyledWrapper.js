import styled from 'styled-components';

const StyledWrapper = styled.div`
  .quick-request-search {
    min-height: 400px;
    display: flex;
    flex-direction: column;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    color: ${(props) => props.theme.colors.text.muted};
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 2.5rem;
    background: ${(props) => props.theme.modal.input.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 4px;
    color: ${(props) => props.theme.text};
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s ease;

    &:focus {
      border-color: ${(props) => props.theme.modal.input.focusBorder};
    }

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }
  }

  .clear-button {
    position: absolute;
    right: 0.75rem;
    padding: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    font-size: 18px;
    line-height: 1;

    &:hover {
      opacity: 0.7;
    }
  }

  .results-container {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
    min-height: 250px;
    margin: 0 -1rem;
    padding: 0 1rem;
  }

  .no-results {
    padding: 2rem;
    text-align: center;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 14px;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .result-item {
    padding: 0.625rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: background-color 0.15s ease;
    border: 1px solid transparent;

    &:hover {
      background: ${(props) => props.theme.requestTabPanel.responseOverlayBg};
    }

    &.selected {
      background: ${(props) => props.theme.requestTabPanel.responseOverlayBg};
      border-color: ${(props) => props.theme.modal.input.focusBorder};
    }
  }

  .method {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 3px 6px;
    border-radius: 3px;
    min-width: 48px;
    text-align: center;
    color: white;

    &.method-get {
      background-color: ${(props) => props.theme.request.methods.get};
    }

    &.method-post {
      background-color: ${(props) => props.theme.request.methods.post};
    }

    &.method-put {
      background-color: ${(props) => props.theme.request.methods.put};
    }

    &.method-delete {
      background-color: ${(props) => props.theme.request.methods.delete};
    }

    &.method-patch {
      background-color: ${(props) => props.theme.request.methods.patch};
    }

    &.method-options {
      background-color: ${(props) => props.theme.request.methods.options};
    }

    &.method-head {
      background-color: ${(props) => props.theme.request.methods.head};
    }

    &.method-default {
      background-color: ${(props) => props.theme.request.methods.options};
    }
  }

  .request-info {
    flex: 1;
    min-width: 0;
  }

  .request-name {
    color: ${(props) => props.theme.text};
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 0.125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .request-path {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    overflow: hidden;
  }

  .collection-name {
    flex-shrink: 0;
  }

  .separator {
    flex-shrink: 0;
  }

  .request-url {
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shortcuts-footer {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid ${(props) => props.theme.modal.input.border};
  }

  .shortcuts-hint {
    display: flex;
    gap: 1.5rem;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .shortcut {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  kbd {
    padding: 0.125rem 0.375rem;
    background: ${(props) => props.theme.requestTabPanel.responseOverlayBg};
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 3px;
    font-size: 11px;
    font-family: monospace;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;