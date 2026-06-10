import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 10;

  .ai-assist-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid transparent;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
    opacity: 0.7;

    &:hover,
    &.open {
      opacity: 1;
      color: ${(props) => props.theme.colors.accent};
      background: ${(props) => props.theme.colors.accent}10;
      border-color: ${(props) => props.theme.input.border};
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.colors.accent}55;
      outline-offset: 1px;
    }
  }

  .ai-assist-popup {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    width: 360px;
    background: ${(props) => props.theme.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    overflow: hidden;
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid ${(props) => props.theme.input.border};
  }

  .popup-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => props.theme.text};
    text-transform: uppercase;
    letter-spacing: 0.05em;

    svg {
      color: ${(props) => props.theme.colors.accent};
    }
  }

  .popup-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.input.bg};
      color: ${(props) => props.theme.text};
    }
  }

  .popup-body {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .popup-input {
    width: 100%;
    padding: 8px 10px;
    font-size: 12px;
    font-family: inherit;
    line-height: 1.4;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    resize: vertical;
    outline: none;
    transition: border-color 0.15s ease;

    &::placeholder {
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.85;
    }

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .popup-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .suggestion-chip {
    padding: 3px 8px;
    font-size: 11px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 999px;
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;

    &:hover:not(:disabled) {
      color: ${(props) => props.theme.text};
      border-color: ${(props) => props.theme.colors.accent}80;
      background: ${(props) => props.theme.colors.accent}10;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .popup-error {
    padding: 6px 8px;
    font-size: 11px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.danger};
    background: ${(props) => props.theme.colors.bg.danger}15;
  }

  .popup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-top: 1px solid ${(props) => props.theme.input.border};
  }

  .popup-hint {
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .popup-loading {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .loading-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid ${(props) => props.theme.input.border};
    border-top-color: ${(props) => props.theme.colors.accent};
    border-radius: 50%;
    animation: ai-assist-spin 0.7s linear infinite;
  }

  @keyframes ai-assist-spin {
    to { transform: rotate(360deg); }
  }

  .btn-generate {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.colors.accent};
    background: ${(props) => props.theme.colors.accent};
    color: white;
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover:not(:disabled) {
      opacity: 0.88;
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  .btn-secondary {
    padding: 5px 12px;
    font-size: 12px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.input.border};
    background: transparent;
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.input.bg};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .preview-label {
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preview-code {
    max-height: 220px;
    overflow: auto;
    padding: 8px 10px;
    font-family: ${(props) => props.theme.font.monospace || 'monospace'};
    font-size: 11.5px;
    line-height: 1.5;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    white-space: pre;
  }

  .preview-modes {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .preview-mode-btn {
    padding: 2px 6px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid transparent;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    font-size: 11px;

    &.active {
      color: ${(props) => props.theme.text};
      border-color: ${(props) => props.theme.input.border};
      background: ${(props) => props.theme.input.bg};
    }

    &:hover:not(.active) {
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
