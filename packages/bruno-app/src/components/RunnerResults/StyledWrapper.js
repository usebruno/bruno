import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  .textbox {
    border: 1px solid #ccc;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background-color: ${(props) => props.theme.modal.input.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};
  }

  .runner-summary {
    border-bottom: 1px solid ${(props) => props.theme.requestTabPanel.card.border};
    padding-bottom: 0.75rem;
  }

  .summary-pill {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.875rem;

    &.passed {
      color: ${(props) => props.theme.colors.text.green};
      background: ${(props) => props.theme.colors.text.green}10;
    }

    &.failed {
      color: ${(props) => props.theme.colors.text.danger};
      background: ${(props) => props.theme.colors.text.danger}10;
    }

    &.skipped {
      color: ${(props) => props.theme.colors.text.yellow};
      background: ${(props) => props.theme.colors.text.yellow}10;
    }

    &.error {
      color: ${(props) => props.theme.colors.text.danger};
      background: ${(props) => props.theme.colors.text.danger}10;
    }
  }

  .request-item {
    margin-bottom: 6px !important;
    
    .request-header {
      padding: 8px 12px !important;
      
      &:hover {
        background: ${props => props.theme.dropdown.hoverBg};
      }
    }

    .request-path {
      font-size: 13px;
    }

    .response-status, .response-error {
      font-size: 12px;
    }

    .test-results {
      margin-top: 4px;
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

  .runner-stats {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px;
    border-radius: 10px;
    background: ${props => props.theme.requestTabPanel.card.bg}50;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      min-width: 80px;
      justify-content: center;

      .stat-label {
        color: ${props => props.theme.colors.text.muted};
        font-weight: 500;
      }

      .stat-value {
        font-weight: 600;
      }

      &:hover {
        background: ${props => props.theme.dropdown.hoverBg}90;
        transform: translateY(-1px);
      }

      &.active {
        background: ${props => props.theme.dropdown.hoverBg};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

        &.success {
          background: ${props => props.theme.colors.text.green}15;
          box-shadow: inset 0 0 0 1px ${props => props.theme.colors.text.green}30;
        }

        &.error {
          background: ${props => props.theme.colors.text.danger}15;
          box-shadow: inset 0 0 0 1px ${props => props.theme.colors.text.danger}30;
        }

        &.warning {
          background: ${props => props.theme.colors.text.yellow}15;
          box-shadow: inset 0 0 0 1px ${props => props.theme.colors.text.yellow}30;
        }
      }

      &.success {
        color: ${props => props.theme.colors.text.green};
        
        &:hover {
          background: ${props => props.theme.colors.text.green}10;
        }
      }

      &.error {
        color: ${props => props.theme.colors.text.danger};
        
        &:hover {
          background: ${props => props.theme.colors.text.danger}10;
        }
      }

      &.warning {
        color: ${props => props.theme.colors.text.yellow};
        
        &:hover {
          background: ${props => props.theme.colors.text.yellow}10;
        }
      }

      svg {
        opacity: 0.9;
      }
    }
  }

  .status-message {
    font-size: 12px;
    padding: 6px 8px;
    border-radius: 3px;
    background: ${props => props.theme.colors.text.danger}10;
    margin-left: 24px;
  }

  .requests-list {
    margin-top: 16px;

    .request-item {
      margin-bottom: 8px;
      border-radius: 6px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      
      .request-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s ease;
        background: ${props => props.theme.requestTabPanel.card.bg}50;

        &:hover {
          background: ${props => props.theme.requestTabPanel.card.bg};
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.04);
        }

        .request-path {
          font-family: monospace;
          font-size: 12px;
          color: ${props => props.theme.colors.text.muted};
          font-weight: 500;
          
          &.clickable {
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: all 0.2s ease;
            
            &:hover {
              color: ${props => props.theme.textLink};
              text-decoration: underline;
            }
          }
        }

        .response-status {
          font-size: 11px;
          color: ${props => props.theme.colors.text.muted};
          padding: 3px 10px;
          border-radius: 4px;
          background: ${props => props.theme.bg};
          font-weight: 500;
        }

        .response-error {
          font-size: 11px;
          color: ${props => props.theme.colors.text.danger};
          padding: 3px 10px;
          border-radius: 4px;
          background: ${props => props.theme.colors.text.danger}10;
          font-weight: 500;
        }
      }

      .error-message {
        margin: 4px 12px;
        padding: 6px 10px;
        font-size: 11px;
        color: ${props => props.theme.colors.text.muted};
        background: ${props => props.theme.colors.text.danger}10;
        border-radius: 4px;
      }

      .test-results {
        padding: 4px 12px;
        
        .test-result {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 6px;
          font-size: 11px;

          &.pass {
            color: ${props => props.theme.colors.text.green};
          }

          &.fail {
            color: ${props => props.theme.colors.text.danger};
          }

          .result-error {
            margin-top: 2px;
            padding-left: 20px;
            color: ${props => props.theme.colors.text.muted};
          }
        }
      }
    }
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid ${props => props.theme.requestTabPanel.card.border}50;

    button {
      transition: all 0.2s ease;
      border-radius: 6px;
      padding: 6px 14px;
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      }
    }
  }

  .test-warning {
    color: ${props => props.theme.colors.text.yellow};
  }

  .runner-results-layout {
    display: flex;
    flex-direction: row;
    gap: 4px;
    height: calc(100vh - 140px);
    overflow: hidden;
  }

  .requests-column {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .response-pane-wrapper {
    width: 45%;
    min-width: 400px;
    max-width: 800px;
    border-left: 1px solid ${props => props.theme.requestTabPanel.card.border};
    background: ${props => props.theme.bg};
    display: flex;
    flex-direction: column;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.03);
    border-radius: 0 6px 6px 0;
    overflow: hidden;
    height: 100%;

    .response-pane-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid ${props => props.theme.requestTabPanel.card.border}50;
      background: ${props => props.theme.requestTabPanel.card.bg}80;
      backdrop-filter: blur(8px);
      border-radius: 0 6px 0 0;

      .font-medium {
        font-size: 13px;
        color: ${props => props.theme.colors.text.primary};
        font-weight: 600;
      }

      .close-btn {
        color: ${props => props.theme.colors.text.muted};
        font-size: 18px;
        line-height: 1;
        padding: 4px 8px;
        cursor: pointer;
        border: none;
        background: none;
        border-radius: 4px;
        transition: all 0.2s ease;

        &:hover {
          color: ${props => props.theme.colors.text.danger};
          background: ${props => props.theme.colors.text.danger}10;
          transform: translateY(-1px);
        }
      }
    }

    .response-pane-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  }

  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: ${props => props.theme.bg}F0;
    border-bottom: 1px solid ${props => props.theme.requestTabPanel.card.border}20;
    margin-bottom: 12px;
    backdrop-filter: blur(10px);
    border-radius: 6px;
  }

  .requests-container {
    flex: 1;
    overflow-y: auto;
    max-height: calc(100vh - 180px);
    height: 100%;
    padding-bottom: 16px;
    position: relative;

    .requests-list {
      margin-top: 16px;

      .request-item {
        margin-bottom: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
        
        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
          background: ${props => props.theme.requestTabPanel.card.bg}50;

          &:hover {
            background: ${props => props.theme.requestTabPanel.card.bg};
          }

          .request-path {
            font-family: monospace;
            font-size: 12px;
            color: ${props => props.theme.colors.text.muted};
            
            &.clickable {
              cursor: pointer;
              display: flex;
              align-items: center;
              transition: all 0.2s ease;
              
              &:hover {
                color: ${props => props.theme.textLink};
                text-decoration: underline;
              }
            }
          }

          .response-status {
            font-size: 11px;
            color: ${props => props.theme.colors.text.muted};
            padding: 2px 8px;
            border-radius: 3px;
            background: ${props => props.theme.bg};
          }

          .response-error {
            font-size: 11px;
            color: ${props => props.theme.colors.text.danger};
            padding: 2px 8px;
            border-radius: 3px;
            background: ${props => props.theme.colors.text.danger}10;
          }
        }

        .error-message {
          margin: 4px 12px;
          padding: 6px 10px;
          font-size: 11px;
          color: ${props => props.theme.colors.text.muted};
          background: ${props => props.theme.colors.text.danger}10;
          border-radius: 4px;
        }

        .test-results {
          padding: 4px 12px;
          
          .test-result {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 3px 6px;
            font-size: 11px;

            &.pass {
              color: ${props => props.theme.colors.text.green};
            }

            &.fail {
              color: ${props => props.theme.colors.text.danger};
            }

            .result-error {
              margin-top: 2px;
              padding-left: 20px;
              color: ${props => props.theme.colors.text.muted};
            }
          }
        }
      }
    }

    /* Style scrollbars */
    &::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: ${props => props.theme.scrollbar.color};
      border-radius: 2px;
    }
  }
`;

export default Wrapper;
