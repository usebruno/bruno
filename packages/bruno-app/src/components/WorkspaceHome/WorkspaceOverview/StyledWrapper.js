import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;

  .overview-layout {
    display: flex;
    height: 100%;
  }

  .overview-main {
    flex: 3;
    padding: 20px 16px 16px;
    overflow-y: auto;
    border-right: 1px solid ${(props) => props.theme.workspace.border};
  }

  .overview-docs {
    display: flex;
    flex: 2;
    flex-direction: column;
    overflow: hidden;
  }

  .stats-row {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-value {
    font-size: 22px;
    font-weight: 600;
    color: ${(props) => props.theme.text};
    line-height: 1;
  }

  .stat-label {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .quick-actions-section {
    margin-bottom: 16px;
  }

  .section-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 8px;
  }

  .quick-actions-buttons {
    display: flex;
    gap: 8px;
  }

  .quick-action-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border: 1px solid ${(props) => props.theme.brand};
    border-radius: ${(props) => props.theme.border.radius.base};
    background: transparent;
    color: ${(props) => props.theme.brand};
    font-size: ${(props) => props.theme.font.size.sm};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.brand}10;
    }
  }

  .collections-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
`;

export default StyledWrapper;
