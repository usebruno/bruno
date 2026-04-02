import styled from 'styled-components';

const Wrapper = styled.div`
  .textbox {
    padding: 0.2rem 0.5rem;
    outline: none;
    font-size: ${(props) => props.theme.font.size.sm};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    height: 1.875rem;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &[type='number'] {
      -moz-appearance: textfield;
      appearance: textfield;
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }
  }

  /* Radio button styles */
  input[type='radio'] {
    cursor: pointer;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.bg};
    flex-shrink: 0;

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.input.focusBorder};
      outline-offset: 2px;
    }

    &:checked {
      border: 1px solid ${(props) => props.theme.primary.solid};
      background-image: radial-gradient(circle, ${(props) => props.theme.primary.solid} 40%, ${(props) => props.theme.bg} 42%);
    }
  }

  .item-path {
    .link {
      color: ${(props) => props.theme.textLink};
    }
  }
  .danger {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .test-summary {
    color: ${(props) => props.theme.tabs.active.border};
  }

  /* test results */
  .test-success {
    color: ${(props) => props.theme.colors.text.green};
  }

  .test-failure {
    color: ${(props) => props.theme.colors.text.danger};

    .error-message {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }
  
  .skipped-request {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .text-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .text-green {
    color: ${(props) => props.theme.colors.text.green};
  }

  .text-subtext0 {
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .text-subtext1 {
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .hover-bg-surface {
    &:hover {
      background-color: ${(props) => props.theme.background.surface1};
    }
  }

  .button-sm {
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .run-config-panel, .run-config-option {
    border-color: ${(props) => props.theme.background.surface1};
  }

  .runner-section-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
  }

  .runner-section {
    font-size: ${(props) => props.theme.font.size.sm};

    div:has(> .single-line-editor) {
      height: 1.875rem;
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: ${(props) => props.theme.border.radius.sm};
      background-color: ${(props) => props.theme.input.bg};
      padding: 0.2rem 0.5rem;
    }

    div:has(> .single-line-editor):focus-within {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    .single-line-editor {
      height: 1.475rem;
      font-size: ${(props) => props.theme.font.size.sm};

      .CodeMirror {
        height: 1.475rem;
        line-height: 1.475rem;
      }

      .CodeMirror-cursor {
        height: 0.875rem !important;
        margin-top: 0.3rem !important;
      }
    }
  }


  /* Iteration data loaded indicator */
  .iteration-file-loaded {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.375rem 0.625rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.background.surface0};
    border: 1px solid ${(props) => props.theme.border.border0};
    font-size: ${(props) => props.theme.font.size.xs};
    margin-top: 0.5rem;
  }

  .iteration-file-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    .iteration-file-name {
      font-weight: 600;
      color: ${(props) => props.theme.colors.text.text};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .iteration-file-meta {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .iteration-file-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-left: 0.5rem;

    button {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};

      &:hover {
        color: ${(props) => props.theme.colors.text.text};
      }

      &.btn-remove:hover {
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }

  .run-config-section {
    border: 1px solid ${(props) => props.theme.background.surface1};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.75rem;
  }

  .run-config-heading {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 700;
    color: ${(props) => props.theme.colors.text.text};
    margin-bottom: 0;
  }

  .textbox-with-suffix {
    display: flex;
    align-items: center;
    height: 1.875rem;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    overflow: hidden;

    &:focus-within {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    .textbox {
      flex: 1;
      height: 100%;
      border: none;
      background: transparent;
      padding: 0.2rem 0.5rem;
      outline: none;
      font-size: ${(props) => props.theme.font.size.sm};
      min-width: 0;
    }

    .textbox-suffix {
      padding: 0 0.5rem;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      background-color: ${(props) => props.theme.background.mantle};
      height: 100%;
      display: flex;
      align-items: center;
      border-left: 1px solid ${(props) => props.theme.input.border};
      flex-shrink: 0;
    }
  }

  .iteration-data-link {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
    display: block;

    &:hover {
      text-decoration: underline;
    }
  }

  .advanced-settings-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .advanced-setting-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
    color: ${(props) => props.theme.colors.text.text};

    input[type='checkbox'] {
      cursor: pointer;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid ${(props) => props.theme.input.border};
      background-color: ${(props) => props.theme.input.bg};
      flex-shrink: 0;
      position: relative;

      &:focus-visible {
        outline: 2px solid ${(props) => props.theme.input.focusBorder};
        outline-offset: 2px;
      }

      &:checked {
        background-color: ${(props) => props.theme.primary.solid};
        border-color: ${(props) => props.theme.primary.solid};

        &::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 1px;
          width: 5px;
          height: 8px;
          border: 2px solid #fff;
          border-top: none;
          border-left: none;
          transform: rotate(45deg);
        }
      }
    }

    span {
      font-size: ${(props) => props.theme.font.size.sm};
    }
  }

  .filter-bar {
    display: flex;
    align-items: stretch;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: 1px solid ${(props) => props.theme.border.border0};
    max-height: 35px;
    flex-shrink: 0;
    overflow: hidden;

    .filter-label {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-top-left-radius: ${(props) => props.theme.border.radius.base};
      border-bottom-left-radius: ${(props) => props.theme.border.radius.base};
      background-color: ${(props) => props.theme.background.mantle};

      span {
        font-family: Inter, sans-serif;
        font-weight: 400;
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.colors.text.text};
      }
    }

    .filter-buttons {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 0.5rem 0.75rem 0 0.75rem;
      border-top-right-radius: ${(props) => props.theme.border.radius.base};
      border-bottom-right-radius: ${(props) => props.theme.border.radius.base};
      background: transparent;
    }
  }

  .filter-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0;
    padding-bottom: 0.4rem;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    font-family: Inter, sans-serif;
    line-height: 100%;
    letter-spacing: 0%;
    cursor: pointer;
    transition: color 0.15s ease, border-bottom-color 0.15s ease;
    outline: none;

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.tabs.active.border};
      outline-offset: 2px;
    }

    .filter-count {
      padding: 2px 4.5px;
      border-radius: 2px;
      border: 1px solid ${(props) => props.theme.border.border0};
      background-color: ${(props) => props.theme.background.surface0};
      font-family: Inter, sans-serif;
      font-size: ${(props) => props.theme.font.size.xs};
      font-weight: 500;
      line-height: 100%;
      letter-spacing: 0%;
    }

    &.active {
      font-weight: ${(props) => props.theme.tabs.active.fontWeight};
      color: ${(props) => props.theme.tabs.active.color};
      border-bottom-color: ${(props) => props.theme.tabs.active.border};

      .filter-count {
        color: ${(props) => props.theme.tabs.active.color};
      }
    }

    &:not(.active) {
      font-weight: 500;
      color: ${(props) => props.theme.colors.text.subtext0};

      .filter-count {
        color: ${(props) => props.theme.colors.text.subtext0};
      }
    }
  }
`;

export default Wrapper;
