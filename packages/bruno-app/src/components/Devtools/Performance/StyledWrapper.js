import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tab-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: ${(props) => props.theme.console.bg};
  }

  .tab-content-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .overview-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .overview-section {
    margin-bottom: 32px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .section-header {
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid ${(props) => props.theme.console.border};

    h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 500;
      color: ${(props) => props.theme.console.titleColor};
    }

    p {
      margin: 0;
      font-size: ${(props) => props.theme.font.size.base};
      color: ${(props) => props.theme.console.textMuted};
    }
  }

    .system-resources {
    margin-bottom: 16px;

    h2 {
      margin: 0 0 8px 0;
      font-size: ${(props) => props.theme.font.size.base};
      font-weight: 500;
      color: ${(props) => props.theme.console.titleColor};
    }
  }

  .resource-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
    margin-bottom: 16px;
  }

  .resource-card {
    background: ${(props) => props.theme.console.headerBg};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
    padding: 8px;
  }

  .resource-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    color: ${(props) => props.theme.console.titleColor};
  }

  .resource-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
  }

  .resource-value {
    font-size: 18px;
    font-weight: 500;
    color: ${(props) => props.theme.console.titleColor};
    margin-bottom: 2px;
  }

  .resource-subtitle {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.console.buttonColor};
  }

  .resource-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: ${(props) => props.theme.font.size.xs};
    margin-top: 8px;

    &.up {
      color: #10b981;
    }

    &.down {
      color: #e81123;
    }

    &.stable {
      color: ${(props) => props.theme.console.buttonColor};
    }
  }

  .performance-header {
    display: flex;
    align-items: center;
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    padding: 12px 16px;
    background: ${(props) => props.theme.console.headerBg};
  }

  .performance-selector-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .performance-selector-label {
    font-size: 13px;
    font-weight: 500;
    color: ${(props) => props.theme.console.titleColor};
    user-select: none;
  }

  .performance-selector {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .performance-select {
    appearance: none;
    background: ${(props) => props.theme.console.bg};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
    padding: 6px 32px 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: ${(props) => props.theme.console.titleColor};
    cursor: pointer;
    outline: none;
    transition: all 0.2s ease;
    min-width: 250px;
    max-width: 400px;

    &:hover {
      border-color: ${(props) => props.theme.colors.primary};
    }

    &:focus {
      border-color: ${(props) => props.theme.colors.primary};
      box-shadow: 0 0 0 2px ${(props) => props.theme.colors.primary}33;
    }

    option {
      background: ${(props) => props.theme.console.bg};
      color: ${(props) => props.theme.console.titleColor};
      padding: 8px;
    }
  }

  .performance-select-icon {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: ${(props) => props.theme.console.buttonColor};
  }

  .processes-table-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;

    h2 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: ${(props) => props.theme.console.titleColor};
      flex-shrink: 0;
    }
  }

  .no-processes {
    padding: 32px;
    text-align: center;
    color: ${(props) => props.theme.console.buttonColor};
    font-size: 13px;
  }

  .processes-table-wrapper {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .processes-table {
    width: 100%;
    border-collapse: collapse;
    background: ${(props) => props.theme.console.headerBg};
    border: 1px solid ${(props) => props.theme.console.border};
    border-radius: 4px;
    overflow: hidden;

    thead {
      background: ${(props) => props.theme.console.bg};
      border-bottom: 1px solid ${(props) => props.theme.console.border};

      th {
        padding: 10px 12px;
        text-align: left;
        font-size: 12px;
        font-weight: 600;
        color: ${(props) => props.theme.console.titleColor};
        text-transform: uppercase;
        letter-spacing: 0.5px;

        &:first-child {
          padding-left: 16px;
        }

        &:last-child {
          padding-right: 16px;
        }
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid ${(props) => props.theme.console.border};
        transition: background 0.15s ease;

        &:hover {
          background: ${(props) => props.theme.console.bg};
        }

        &:last-child {
          border-bottom: none;
        }
      }

      td {
        padding: 10px 12px;
        font-size: 13px;
        color: ${(props) => props.theme.console.textColor};

        &:first-child {
          padding-left: 16px;
        }

        &:last-child {
          padding-right: 16px;
        }
      }
    }

    .pid-cell {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      color: ${(props) => props.theme.console.buttonColor};
    }

    .type-cell {
      .process-type-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 500;
        text-transform: lowercase;
        background: ${(props) => props.theme.console.border};
        color: ${(props) => props.theme.console.buttonColor};

        &.Browser {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        &.Renderer {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        &.Utility {
          background: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
        }

        &.Zygote {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        &.Sandbox {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      }
    }

    .title-cell {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cpu-cell {
      font-weight: 500;

      .high-cpu {
        color: #ef4444;
      }

      .medium-cpu {
        color: #f59e0b;
      }

      .low-cpu {
        color: ${(props) => props.theme.console.buttonColor};
      }
    }

    .memory-cell {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
    }

    .created-cell {
      font-size: 12px;
      color: ${(props) => props.theme.console.buttonColor};
    }
  }
`;

export default StyledWrapper;
