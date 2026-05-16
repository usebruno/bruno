import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${(props) => props.theme.background.base};
  color: ${(props) => props.theme.text};
  font-size: ${(props) => props.theme.font.size.base};

  .network-intercept-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background-color: ${(props) => props.theme.background.mantle};
    border-bottom: 1px solid ${(props) => props.theme.border.border0};

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;

      .title {
        font-weight: 600;
        font-size: 14px;
      }

      .status-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.2rem 0.6rem;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 500;

        &.running {
          background-color: ${(props) => props.theme.request.methods.get}20;
          color: ${(props) => props.theme.request.methods.get};
        }

        &.starting {
          background-color: ${(props) => props.theme.request.methods.put}20;
          color: ${(props) => props.theme.request.methods.put};
        }

        &.stopped {
          background-color: ${(props) => props.theme.request.methods.delete}20;
          color: ${(props) => props.theme.request.methods.delete};
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: currentColor;

          &.pulse {
            animation: pulse 2s infinite;
          }
        }
      }
    }
  }

  .network-intercept-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .network-logs-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 400px;

    &.full-width {
      width: 100%;
    }
  }

  .request-detail-panel {
    width: 50%;
    border-left: 1px solid ${(props) => props.theme.border.border0};
    background-color: ${(props) => props.theme.background.mantle};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); opacity: 0.7; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.7; }
  }
`;

export default StyledWrapper;
