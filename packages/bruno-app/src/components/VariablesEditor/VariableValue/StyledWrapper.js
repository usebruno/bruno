import styled from 'styled-components';

const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`;

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  min-width: 0;

  &.is-object {
    align-items: flex-start;
  }

  .value-content {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    height: 100%;
  }

  &.is-object .value-content {
    align-items: flex-start;
    height: auto;
  }

  .value-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    text-align: left;
    line-height: 33px;
    font-family: ${MONO};
    font-size: 12px;
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

  .v-str {
    color: ${(props) => props.theme.codemirror.tokens.string};

    &.is-var-ref {
      color: ${(props) => props.theme.codemirror.variable.valid};
    }
  }
  .v-num {
    color: ${(props) => props.theme.codemirror.tokens.number};
  }
  .v-bool {
    color: ${(props) => props.theme.codemirror.tokens.atom};
  }
  .v-null,
  .empty-value {
    color: ${(props) => props.theme.colors.text.muted};
    font-style: italic;
  }

  .object-value,
  .value-tree-scroll {
    min-width: 0;
    width: 100%;
    max-width: 100%;
    max-height: 168px;
    overflow: auto;
    scrollbar-width: thin;
  }

  .row-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 2px;
    /* Match single-line value cell so icons sit with scalar-row actions. */
    height: 33px;
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

    &.is-selected {
      color: ${(props) => props.theme.colors?.text?.link || props.theme.primary?.strong || '#546de5'};
    }
  }
`;

export default StyledWrapper;
