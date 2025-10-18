import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tab-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: ${props => props.theme.console.bg};
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
    border-bottom: 1px solid ${props => props.theme.console.border};

    h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: ${props => props.theme.console.titleColor};
    }

    p {
      margin: 0;
      font-size: 13px;
      color: ${props => props.theme.console.textMuted};
    }
  }

    .system-resources {
    margin-bottom: 16px;

    h2 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: ${props => props.theme.console.titleColor};
    }
  }

  .resource-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
    margin-bottom: 16px;
  }

  .resource-card {
    background: ${props => props.theme.console.headerBg};
    border: 1px solid ${props => props.theme.console.border};
    border-radius: 4px;
    padding: 8px;
  }

  .resource-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    color: ${props => props.theme.console.titleColor};
  }

  .resource-title {
    font-size: 12px;
    font-weight: 500;
  }

  .resource-value {
    font-size: 18px;
    font-weight: 600;
    color: ${props => props.theme.console.titleColor};
    margin-bottom: 2px;
  }

  .resource-subtitle {
    font-size: 11px;
    color: ${props => props.theme.console.buttonColor};
  }

  .resource-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    margin-top: 8px;

    &.up {
      color: #10b981;
    }

    &.down {
      color: #e81123;
    }

    &.stable {
      color: ${props => props.theme.console.buttonColor};
    }
  }
`;

export default StyledWrapper;
