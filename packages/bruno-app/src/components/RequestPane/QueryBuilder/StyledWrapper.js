import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};
  outline: none;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .query-builder-search {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    flex-shrink: 0;
    gap: 6px;

    input {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: 4px;
      background: ${(props) => props.theme.input.bg};
      color: ${(props) => props.theme.text};
      font-size: 12px;

      &:focus {
        outline: none;
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
      }
    }

  }

  .sync-error-banner {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 6px 10px;
    margin: 4px 8px;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.colors.text.danger}30;
    background: ${(props) => props.theme.colors.text.danger}08;
    flex-shrink: 0;
    font-size: 11px;
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};

    .sync-error-icon {
      color: ${(props) => props.theme.colors.text.danger};
      flex-shrink: 0;
      margin-top: 2px;
    }

    .sync-error-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      strong {
        color: ${(props) => props.theme.text};
        font-size: 11px;
        font-weight: 600;
      }

      code {
        background: ${(props) => props.theme.background.surface0};
        padding: 0px 3px;
        border-radius: 2px;
        font-size: 10px;
        white-space: nowrap;
      }
    }
  }

  .query-builder-tree {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: auto;
    padding: 2px 0;
  }

  .root-type-disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  .root-type-node {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 6px 8px;
    cursor: pointer;
    font-size: 13px;
    background: none;
    border: none;
    outline: none;
    text-align: left;

    &:hover,
    &:focus-visible {
      background: ${(props) => props.theme.background.surface0};
    }

    &:disabled {
      cursor: default;

      &:hover,
      &:focus-visible {
        background: none;
      }
    }

    .root-type-name {
      font-weight: 600;
      color: ${(props) => props.theme.colors.text.muted};
    }

    .root-type-count {
      margin-left: auto;
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 12px;
    }
  }

  .field-chevron {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.5;
    margin-right: 2px;
  }

  .field-node {
    display: flex;
    align-items: center;
    padding: 4px 8px 4px 4px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1.4;
    white-space: nowrap;
    width: fit-content;
    min-width: 100%;
    outline: none;

    &:hover,
    &:focus-visible {
      background: ${(props) => props.theme.background.surface0};
    }

    .field-indent {
      flex-shrink: 0;
    }

    .field-checkbox {
      margin: 0 6px 0 0;
      cursor: pointer;
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      accent-color: ${(props) => props.theme.colors.accent};
      vertical-align: middle;
    }

    .field-name {
      color: ${(props) => props.theme.text};
      font-weight: 500;
    }

    .field-separator {
      color: ${(props) => props.theme.colors.text.muted};
      margin: 0 6px;
      flex-shrink: 0;
    }

    .field-type {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 12px;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .union-label {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 12px;
    }
  }

  .section-header {
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted};
    padding: 6px 8px 4px;
    letter-spacing: 0.5px;
    user-select: none;
  }

  .arg-row {
    display: flex;
    align-items: center;
    padding: 3px 8px;
    font-size: 13px;
    min-width: 0;
    cursor: default;

    .input-object-chevron {
      width: 14px;
      height: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: 0.5;
      margin-right: 2px;
      cursor: pointer;
      background: none;
      border: none;
      outline: none;
      padding: 0;
      color: inherit;
    }

    .input-object-chevron-spacer {
      width: 14px;
      flex-shrink: 0;
      margin-right: 2px;
    }

    .field-type {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 12px;
      flex-shrink: 0;
      margin-left: 4px;
    }

    .field-checkbox {
      margin: 0 6px 0 0;
      cursor: pointer;
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      accent-color: ${(props) => props.theme.colors.accent};
      vertical-align: middle;
    }

    .arg-name {
      color: ${(props) => props.theme.text};
      flex-shrink: 0;
      margin-right: 4px;
    }

    .arg-required {
      color: ${(props) => props.theme.colors.text.danger};
      font-weight: 700;
      margin-right: 6px;
      flex-shrink: 0;
    }

    input:not(.field-checkbox), select {
      padding: 3px 8px;
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: 4px;
      background: ${(props) => props.theme.input.bg};
      color: ${(props) => props.theme.text};
      font-size: 12px;
      flex: 1;
      min-width: 0;
      cursor: text;

      &:focus {
        outline: none;
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
        opacity: 0.6;
      }
    }

    select {
      cursor: pointer;
    }

  }

  .list-complex-unsupported {
    display: inline-flex;
    align-items: center;
    color: ${(props) => props.theme.colors.text.muted};
    margin-left: 8px;
    cursor: help;
  }

  .list-arg-remove,
  .list-arg-remove-spacer {
    width: 17px;
    flex-shrink: 0;
    margin-left: 4px;
    display: flex;
    align-items: center;
  }

  .list-arg-remove {
    cursor: pointer;
    opacity: 0.4;
    background: none;
    border: none;
    outline: none;
    padding: 0;
    color: inherit;

    &:hover {
      opacity: 1;
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .empty-state {
    padding: 12px;
    text-align: center;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
  }

  .schema-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 20px;
    text-align: center;
    gap: 12px;

    .empty-state-icon {
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.6;

      &.warning {
        color: ${(props) => props.theme.colors.text.danger};
        opacity: 0.8;
      }
    }

    .empty-state-title {
      font-size: 14px;
      font-weight: 600;
      color: ${(props) => props.theme.text};
    }

    .empty-state-description {
      font-size: 12px;
      color: ${(props) => props.theme.colors.text.muted};
      line-height: 1.5;
      max-width: 240px;
      word-break: break-word;
    }

    .empty-state-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 240px;

      button {
        border-color: ${(props) => props.theme.border.border1};
        color: ${(props) => props.theme.colors.text.muted};
      }
    }
  }
`;

export default StyledWrapper;
