import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .browser-dropdown {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    min-width: 200px;
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: ${(props) => props.theme.shadow.md};
    z-index: 100;
    overflow: hidden;

    .dropdown-header {
      padding: 0.75rem 1rem;
      font-size: 11px;
      font-weight: 600;
      color: ${(props) => props.theme.colors.text.muted};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background-color: ${(props) => props.theme.background.mantle};
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1rem;
      cursor: pointer;
      font-size: ${(props) => props.theme.font.size.sm};
      transition: background-color 0.15s;

      &:hover {
        background-color: ${(props) => props.theme.background.surface0};
      }

      &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .browser-icon {
        font-size: 16px;
      }
    }

    .dropdown-divider {
      height: 1px;
      background-color: ${(props) => props.theme.border.border0};
      margin: 4px 0;
    }
  }

  .launched-browsers {
    display: flex;
    gap: 0.35rem;

    .launched-browser-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.2rem 0.6rem;
      background-color: ${(props) => props.theme.request.methods.get}20;
      color: ${(props) => props.theme.request.methods.get};
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;

      svg {
        flex-shrink: 0;
      }

      .close-btn {
        display: flex;
        cursor: pointer;
        &:hover { opacity: 0.7; }
      }
    }
  }

  .terminal-setup-modal,
  .system-setup-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .modal-content {
      background-color: ${(props) => props.theme.background.base};
      border-radius: ${(props) => props.theme.border.radius.lg};
      padding: 1.5rem;
      max-width: 600px;
      width: 90%;
      box-shadow: ${(props) => props.theme.shadow.lg};

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;

        h3 { margin: 0; font-size: 1.1rem; }
        .close-btn { cursor: pointer; color: ${(props) => props.theme.colors.text.muted}; }
      }

      .shell-section {
        margin-bottom: 1rem;

        .shell-label {
          font-size: 12px;
          font-weight: 600;
          color: ${(props) => props.theme.colors.text.muted};
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }

        .command-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background-color: ${(props) => props.theme.background.mantle};
          padding: 0.75rem;
          border-radius: ${(props) => props.theme.border.radius.sm};
          border: 1px solid ${(props) => props.theme.border.border0};

          code {
            flex: 1;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 12px;
            color: ${(props) => props.theme.text};
            word-break: break-all;
          }
        }
      }

      .info-text {
        font-size: 12px;
        color: ${(props) => props.theme.colors.text.muted};
        line-height: 1.5;
        margin-top: 1rem;
        padding: 0.75rem;
        background-color: ${(props) => props.theme.background.surface0};
        border-radius: ${(props) => props.theme.border.radius.sm};
      }

      .note {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        background-color: ${(props) => props.theme.background.surface0};
        border: 1px solid ${(props) => props.theme.border.border0};
        border-radius: ${(props) => props.theme.border.radius.sm};
        color: ${(props) => props.theme.text};
        margin-bottom: 1rem;

        svg { flex-shrink: 0; margin-top: 2px; }

        .note-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;

          .auto-buttons {
            display: flex;
            gap: 0.5rem;
          }
        }
      }

      .proxy-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;

        .proxy-item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.35rem;
          padding: 0.75rem;
          background-color: ${(props) => props.theme.background.mantle};
          border: 1px solid ${(props) => props.theme.border.border0};
          border-radius: ${(props) => props.theme.border.radius.sm};

          .proxy-label {
            grid-column: 1 / -1;
            font-size: 11px;
            text-transform: uppercase;
            color: ${(props) => props.theme.colors.text.muted};
            letter-spacing: 0.03em;
          }

          .proxy-value {
            align-self: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            &.trunc { max-width: 260px; }
          }

          button {
            justify-self: end;
          }
        }
      }

      .warning-text {
        color: ${(props) => props.theme.request.methods.delete};
        font-size: 12px;
        margin: 0.5rem 0 1rem 0;
      }

      .os-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        border-bottom: 1px solid ${(props) => props.theme.border.border0};
        padding-bottom: 0.5rem;

        .os-tab {
          padding: 0.4rem 0.75rem;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          color: ${(props) => props.theme.colors.text.muted};
          border-radius: ${(props) => props.theme.border.radius.sm};
          transition: all 0.2s;

          &:hover {
            background-color: ${(props) => props.theme.background.surface0};
            color: ${(props) => props.theme.text};
          }

          &.active {
            background-color: ${(props) => props.theme.background.surface1};
            color: ${(props) => props.theme.text};
          }
        }
      }

      .os-section {
        margin-top: 1rem;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        .step {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;

          .step-number {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            background-color: ${(props) => props.theme.accents.primary}20;
            color: ${(props) => props.theme.accents.primary};
            border-radius: 50%;
            font-size: 11px;
            font-weight: 700;
            flex-shrink: 0;
            border: 1px solid ${(props) => props.theme.accents.primary}40;
          }

          .step-content {
            flex: 1;
            padding-top: 1px;

            p {
              margin: 0;
              font-size: 13px;
              color: ${(props) => props.theme.colors.text.muted};
              line-height: 1.4;

              span {
                color: ${(props) => props.theme.text};
                font-weight: 500;
              }
            }

            code {
              background: ${(props) => props.theme.background.surface0};
              padding: 0.05rem 0.25rem;
              border-radius: 4px;
              font-family: inherit;
              font-weight: 600;
              color: ${(props) => props.theme.accents.primary};
            }
          }
        }
      }

      .limitations {
        padding: 0.75rem 1rem;
        background-color: ${(props) => props.theme.background.mantle};
        border-radius: ${(props) => props.theme.border.radius.md};
        border: 1px solid ${(props) => props.theme.border.border0};

        .limitations-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 12px;
          color: ${(props) => props.theme.text};

          svg {
            color: ${(props) => props.theme.colors.text.muted};
          }
        }

        ul {
          margin: 0;
          padding-left: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          li {
            font-size: 12px;
            color: ${(props) => props.theme.colors.text.muted};
            line-height: 1.3;
          }
        }
      }
    }
  }
`;

export default StyledWrapper;
