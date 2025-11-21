import styled from 'styled-components';

const Wrapper = styled.div`
  /* Polaris-inspired OAuth2 form layout */
  
  /* Section container */
  .oauth-section {
    margin-bottom: 1.5rem;
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  /* Section header */
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
    
    .section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: ${(props) => props.theme.requestTabPanel?.oauth?.sectionIconBg || '#F6F6F7'};
      color: ${(props) => props.theme.brand || '#0052CC'};
    }
    
    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: ${(props) => props.theme.text || '#202223'};
      letter-spacing: 0.01em;
    }
  }

  /* Form field container */
  .form-field {
    margin-bottom: 1rem;
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  /* Label styling - above input */
  .form-label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${(props) => props.theme.text || '#202223'};
    line-height: 1.25rem;
  }

  /* Help text */
  .help-text {
    margin-top: 0.375rem;
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors?.text?.muted || '#8C9196'};
    line-height: 1.25rem;
  }

  /* Input wrapper */
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Single line editor wrapper */
  .single-line-editor-wrapper {
    flex: 1;
    padding: 0.275rem 0.5rem;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
    background-color: ${(props) => props.theme.bg || '#fff'};
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:focus-within {
      border-color: ${(props) => props.theme.brand || '#0052CC'};
      box-shadow: 0 0 0 1px ${(props) => props.theme.brand || '#0052CC'};
    }
  }

  /* Select/Dropdown styling */
  .select-wrapper {
    position: relative;
    display: inline-flex;
    min-width: 200px;
  }

  .select-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
    background-color: ${(props) => props.theme.bg || '#fff'};
    font-size: 0.8125rem;
    color: ${(props) => props.theme.text || '#202223'};
    cursor: pointer;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:hover {
      border-color: ${(props) => props.theme.brand || '#0052CC'};
    }

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.brand || '#0052CC'};
      box-shadow: 0 0 0 1px ${(props) => props.theme.brand || '#0052CC'};
    }

    .select-label {
      font-weight: 500;
    }

    svg {
      flex-shrink: 0;
    }
  }

  /* Checkbox styling */
  .checkbox-field {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 0;
  }

  input[type='checkbox'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1.5px solid ${(props) => props.theme.table?.checkbox?.border || '#8C9196'};
    background: ${(props) => props.theme.bg || '#fff'};
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    position: relative;
    transition: all 150ms ease;
    flex-shrink: 0;
    margin-top: 0.125rem;

    &:hover {
      border-color: ${(props) => props.theme.table?.checkbox?.hoverBorder || '#0052CC'};
    }

    &:checked {
      background: ${(props) => props.theme.table?.checkbox?.checkedBg || '#0052CC'};
      border-color: ${(props) => props.theme.table?.checkbox?.checkedBorder || '#0052CC'};

      &::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 4px;
        height: 8px;
        border: solid ${(props) => props.theme.table?.checkbox?.checkmarkColor || 'white'};
        border-width: 0 2px 2px 0;
        transform: translate(-50%, -55%) rotate(45deg);
      }
    }

    &:focus {
      outline: 2px solid ${(props) => props.theme.table?.checkbox?.focusOutline || '#0052CC33'};
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .checkbox-label {
    flex: 1;
    font-size: 0.8125rem;
    color: ${(props) => props.theme.text || '#202223'};
    line-height: 1.5rem;
    cursor: pointer;

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  /* Action buttons */
  .action-buttons {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    background: ${(props) => props.theme.brand || '#0052CC'};
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 150ms ease;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.tabs?.active?.color || '#003D99'};
    }

    &:active:not(:disabled) {
      background: ${(props) => props.theme.tabs?.active?.color || '#002966'};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    svg {
      flex-shrink: 0;
    }
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
    background: ${(props) => props.theme.bg || '#fff'};
    color: ${(props) => props.theme.text || '#202223'};
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:hover:not(:disabled) {
      border-color: ${(props) => props.theme.brand || '#0052CC'};
      box-shadow: 0 0 0 1px ${(props) => props.theme.brand || '#0052CC'};
    }

    &:active:not(:disabled) {
      background: ${(props) => props.theme.table?.row?.hoverBg || '#F6F6F7'};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    svg {
      flex-shrink: 0;
    }
  }

  /* Token viewer card */
  .token-viewer {
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
    background: ${(props) => props.theme.table?.row?.hoverBg || '#F6F6F7'};
    margin-bottom: 1.5rem;
  }

  .token-info {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .token-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: ${(props) => props.theme.bg || '#fff'};
    color: ${(props) => props.theme.brand || '#0052CC'};
    flex-shrink: 0;
  }

  .token-details {
    flex: 1;
    min-width: 0;
  }

  .token-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors?.text?.muted || '#8C9196'};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.25rem;
  }

  .token-value {
    font-size: 0.8125rem;
    color: ${(props) => props.theme.text || '#202223'};
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    word-break: break-all;
  }

  .token-empty {
    font-size: 0.8125rem;
    color: ${(props) => props.theme.colors?.text?.muted || '#8C9196'};
    font-style: italic;
  }

  /* Collapsible section */
  .collapsible-section {
    margin-top: 1.5rem;
  }

  .collapsible-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 0;
    cursor: pointer;
    user-select: none;

    &:hover .section-title {
      color: ${(props) => props.theme.brand || '#0052CC'};
    }

    svg {
      transition: transform 150ms ease;
    }

    &.expanded svg {
      transform: rotate(90deg);
    }
  }

  .collapsible-content {
    padding-top: 1rem;
  }
`;

export default Wrapper;
