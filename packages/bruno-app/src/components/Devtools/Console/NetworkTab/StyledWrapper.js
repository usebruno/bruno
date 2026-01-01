import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${(props) => props.theme.console.contentBg};
  overflow: hidden;

  .network-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: ${(props) => props.theme.console.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    flex-shrink: 0;
  }

  .network-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${(props) => props.theme.console.titleColor};
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;

    .request-count {
      color: ${(props) => props.theme.console.countColor};
      font-size: ${(props) => props.theme.font.size.sm};
      font-weight: 400;
    }
  }

  .network-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Important for proper flex behavior */
  }

  .network-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${(props) => props.theme.console.emptyColor};
    text-align: center;
    gap: 8px;
    padding: 40px 20px;

    p {
      margin: 0;
      font-size: ${(props) => props.theme.font.size.base};
      font-weight: 500;
    }

    span {
      font-size: ${(props) => props.theme.font.size.sm};
      opacity: 0.7;
    }
  }

  .requests-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    min-height: 0; /* Important for proper flex behavior */
  }

  .requests-header {
    display: grid;
    grid-template-columns: 80px 80px 150px 1fr 100px 80px 80px;
    gap: 12px;
    padding: 4px 16px;
    background: ${(props) => props.theme.console.headerBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    font-size: 10px;
    color: ${(props) => props.theme.console.titleColor};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .requests-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0; /* Important for proper scrolling */
  }

  .request-row {
    display: grid;
    grid-template-columns: 80px 80px 150px 1fr 100px 80px 80px;
    gap: 12px;
    padding: 2px 16px;
    cursor: pointer;
    transition: background-color 0.1s ease;
    font-size: ${(props) => props.theme.font.size.sm};
    align-items: center;

    &:hover {
      background: ${(props) => props.theme.console.logHoverBg};
    }

    &.selected {
      padding-left: 13px;
      background: ${(props) => props.theme.console.logHoverBg};
      border-left: 3px solid ${(props) => props.theme.console.checkboxColor};
    }
  }

  .method-badge {
    display: inline-flex;
    align-items: center;
    justify-content: start;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 45px;
  }

  .status-badge {
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .request-domain {
    color: ${(props) => props.theme.console.messageColor};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .request-path {
    color: ${(props) => props.theme.console.messageColor};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  .request-time {
    color: ${(props) => props.theme.console.timestampColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: ${(props) => props.theme.font.size.xs};
  }

  .request-duration {
    color: ${(props) => props.theme.console.messageColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    text-align: right;
  }

  .request-size {
    color: ${(props) => props.theme.console.messageColor};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    text-align: right;
  }
`;

export default StyledWrapper;
