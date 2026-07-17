import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-label {
    width: 90px;
  }

  .certificate-icon {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .non-passphrase-input {
    width: 300px;
  }

  /* Empty state — same frame as the list so the surface stays put */
  .cert-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.3rem;
    max-width: 800px;
    padding: 2rem 1rem;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    color: ${(props) => props.theme.colors.text.muted};

    svg {
      opacity: 0.5;
      margin-bottom: 0.2rem;
    }

    .cert-empty-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: ${(props) => props.theme.text};
    }

    .cert-empty-text {
      font-size: 0.75rem;
      max-width: 340px;
    }
  }

  /* Certificate list — bordered container with internal dividers */
  .cert-list {
    display: flex;
    flex-direction: column;
    max-width: 800px;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    overflow: hidden;
  }

  .cert-item {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.6rem 0.75rem;
    transition: background-color ease-in-out 0.12s;

    &:not(:last-child) {
      border-bottom: 1px solid ${(props) => props.theme.border.border1};
    }

    &:hover,
    &:focus-within {
      background-color: rgba(128, 128, 128, 0.07);
    }

    /* keep row actions hidden until the row is engaged */
    .action-icon {
      opacity: 0;
      transition: opacity ease-in-out 0.12s;
    }

    &:hover .action-icon,
    &:focus-within .action-icon,
    .action-icon.stay-visible {
      opacity: 1;
    }

    .cert-icon {
      flex-shrink: 0;
      margin-top: 1px;
      color: ${(props) => props.theme.colors.text.yellow};
    }

    .cert-fields {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
      flex: 1;
    }

    .cert-field {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.8125rem;
      min-width: 0;
    }

    .cert-field-label {
      flex-shrink: 0;
      width: 80px;
      color: ${(props) => props.theme.colors.text.muted};
    }

    .cert-field-value {
      min-width: 0;
    }
  }

  /* Cert vs PFX segmented control */
  .type-picker {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.surface1};

    .type-option {
      font-size: 0.8125rem;
      line-height: 1;
      padding: 0.3rem 0.75rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
      color: ${(props) => props.theme.colors.text.muted};
      transition: all ease-in-out 0.12s;

      &:hover {
        color: ${(props) => props.theme.text};
      }

      &.active {
        color: ${(props) => props.theme.text};
        background-color: ${(props) => props.theme.bg};
        box-shadow: 0 0 0 1px ${(props) => props.theme.border.border1};
      }
    }
  }

  /* Selected file in the add form */
  .file-chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8125rem;
    color: ${(props) => props.theme.text};

    svg {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .textbox {
    border: 1px solid #ccc;
    padding: 0.15rem 0.45rem;
    box-shadow: none;
    border-radius: 0px;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .protocol-placeholder {
    height: 100%;
    position: relative;
    display: inline-block;
    width: 60px;
    overflow: hidden;
  }

  .protocol-https,
  .protocol-grpcs,
  .protocol-wss {
    position: absolute;
    right: 8px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .protocol-https {
    animation: slideUpDown 9s infinite;
    transform: translateY(0);
  }

  .protocol-grpcs {
    animation: slideUpDown 9s infinite 3s;
    transform: translateY(100%);
  }

  .protocol-wss {
    animation: slideUpDown 9s infinite 6s;
    transform: translateY(100%);
  }

  @keyframes slideUpDown {
    0%, 30% {
      transform: translateY(0);
    }
    33.33%, 97% {
      transform: translateY(100%);
    }
    100% {
      transform: translateY(0);
    }
  }
`;

export default StyledWrapper;
