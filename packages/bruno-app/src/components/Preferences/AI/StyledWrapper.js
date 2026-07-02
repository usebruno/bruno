import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .ai-tabs {
    border-bottom: 1px solid ${(props) => props.theme.input.border};
    margin-bottom: 14px;
  }

  .ai-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    margin-bottom: -1px;
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;

    &:hover:not(.active) {
      color: ${(props) => props.theme.text};
    }

    &.active {
      color: ${(props) => props.theme.text};
      border-bottom-color: ${(props) => props.theme.colors.accent};
    }

    svg {
      color: inherit;
    }
  }

  .ai-tab-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .ai-master {
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    background: ${(props) => props.theme.input.bg};
  }

  .ai-master-icon {
    color: ${(props) => props.theme.colors.accent};
  }

  .ai-master-summary {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .ai-section-header {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .ai-empty-notice {
    color: ${(props) => props.theme.colors.text.muted};
    background: ${(props) => props.theme.input.bg};
    border: 1px dashed ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
  }

  .provider-row {
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    background: ${(props) => props.theme.input.bg};
    overflow: hidden;
    transition: border-color 0.15s ease;

    &.expanded {
      border-color: ${(props) => props.theme.colors.accent}80;
    }
  }

  .provider-header {
    transition: background-color 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.colors.accent}08;
    }
  }

  .provider-logo {
    color: ${(props) => props.theme.text};
  }

  .provider-status {
    color: ${(props) => props.theme.colors.text.muted};

    &.configured {
      color: ${(props) => props.theme.colors.text.green};
    }
  }

  .status-dot {
    background: ${(props) => props.theme.input.border};

    &.configured {
      background: ${(props) => props.theme.colors.text.green};
      box-shadow: 0 0 0 2px ${(props) => props.theme.colors.text.green}25;
    }
  }

  .chevron {
    color: ${(props) => props.theme.colors.text.muted};
    transition: transform 0.2s ease;

    &.expanded {
      transform: rotate(180deg);
    }
  }

  /* Smooth expand/collapse using grid-template-rows trick */
  .provider-body-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.2s ease;

    &.open {
      grid-template-rows: 1fr;
    }
  }

  .provider-body-inner {
    overflow: hidden;
    min-height: 0;
  }

  .provider-body {
    border-top: 1px solid ${(props) => props.theme.input.border};
  }

  .key-section-label {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .key-input {
    font-family: ${(props) => props.theme.font.monospace || 'monospace'};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};

    &::placeholder {
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.7;
    }

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .key-eye-btn {
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.muted};
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.colors.accent}10;
    }
  }

  .key-display-row {
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.input.bg};
  }

  .key-display-mask {
    font-family: ${(props) => props.theme.font.monospace || 'monospace'};
    color: ${(props) => props.theme.colors.text.muted};
    letter-spacing: 1px;
  }

  .btn-primary {
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.colors.accent};
    background: ${(props) => props.theme.colors.accent};
    color: white;
    transition: opacity 0.15s ease;

    &:hover:not(:disabled) {
      opacity: 0.88;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn-icon {
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.colors.accent}10;
      color: ${(props) => props.theme.text};
    }

    &.danger:hover:not(:disabled) {
      color: ${(props) => props.theme.colors.text.danger};
      background: ${(props) => props.theme.colors.bg.danger}15;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .feedback {
    border-radius: ${(props) => props.theme.border.radius.sm};

    &.success {
      color: ${(props) => props.theme.colors.text.green};
      background: ${(props) => props.theme.colors.text.green}10;
    }

    &.error {
      color: ${(props) => props.theme.colors.text.danger};
      background: ${(props) => props.theme.colors.bg.danger}15;
    }
  }

  .models-label-row {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .model-chip {
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid transparent;
    transition: background-color 0.15s ease, border-color 0.15s ease;

    &:hover:not(.disabled) {
      background: ${(props) => props.theme.colors.accent}08;
    }

    &.selected {
      border-color: ${(props) => props.theme.input.border};
      background: ${(props) => props.theme.colors.accent}06;
    }

    &.disabled {
      opacity: 0.45;
      cursor: not-allowed;

      input,
      label {
        cursor: not-allowed;
      }
    }
  }

  .keyless-hint {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .autocomplete-card {
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    background: ${(props) => props.theme.input.bg};
  }

  .autocomplete-sub {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .autocomplete-card.dimmed {
    opacity: 0.55;
  }

  .autocomplete-row + .autocomplete-row {
    border-top: 1px dashed ${(props) => props.theme.input.border};
  }

  .autocomplete-blocker {
    color: ${(props) => props.theme.colors.text.muted};
    background: ${(props) => props.theme.input.bg};
    border-bottom: 1px solid ${(props) => props.theme.input.border};
  }

  .model-select {
    appearance: none;
    -webkit-appearance: none;
    padding: 4px 24px 4px 8px;
    font-size: 11.5px;
    font-family: inherit;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.bg};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    min-width: 160px;
    transition: border-color 0.15s ease;

    &:hover:not(:disabled) {
      border-color: ${(props) => props.theme.colors.accent}80;
    }

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .model-select-chevron {
    position: absolute;
    right: 6px;
    pointer-events: none;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .trigger-pills {
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    padding: 2px;
    background: ${(props) => props.theme.bg};
  }

  .trigger-pill {
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 500;
    border: 1px solid transparent;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;

    &:hover:not(:disabled):not(.selected) {
      color: ${(props) => props.theme.text};
    }

    &.selected {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.colors.accent}10;
      border-color: ${(props) => props.theme.colors.accent}55;
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .autocomplete-keymap {
    color: ${(props) => props.theme.colors.text.muted};

    kbd {
      display: inline-block;
      padding: 0 4px;
      margin: 0 1px;
      font-family: ${(props) => props.theme.font.monospace || 'monospace'};
      font-size: 10px;
      line-height: 1.5;
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.bg};
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: 3px;
    }
  }

  .compat-add-btn {
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    padding: 3px 8px;
    transition: color 0.15s ease, border-color 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.text};
      border-color: ${(props) => props.theme.colors.accent}80;
    }
  }

  .compat-models-empty {
    color: ${(props) => props.theme.colors.text.muted};
    border: 1px dashed ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};

    code {
      font-family: ${(props) => props.theme.font.monospace || 'monospace'};
      color: ${(props) => props.theme.text};
    }
  }

  .compat-model-row {
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    transition: background-color 0.15s ease, border-color 0.15s ease;

    &.selected {
      background: ${(props) => props.theme.colors.accent}06;
    }

    &.disabled {
      opacity: 0.45;

      input {
        cursor: not-allowed;
      }
    }
  }

  .compat-inline-input {
    background: transparent;
    border: none;
    outline: none;
    color: ${(props) => props.theme.text};
    padding: 2px 4px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    min-width: 0;
    font-family: inherit;

    &::placeholder {
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.6;
    }

    &:focus {
      background: ${(props) => props.theme.bg};
      box-shadow: inset 0 0 0 1px ${(props) => props.theme.input.focusBorder};
    }
  }

  .compat-inline-id {
    font-family: ${(props) => props.theme.font.monospace || 'monospace'};
  }

  .compat-add-model {
    padding-top: 4px;
  }

  .compat-remove-endpoint {
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    padding: 4px 6px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    transition: color 0.15s ease, background-color 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.colors.text.danger};
      background: ${(props) => props.theme.colors.bg.danger}15;
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .spin {
    animation: spin 1s linear infinite;
  }
`;

export default StyledWrapper;
