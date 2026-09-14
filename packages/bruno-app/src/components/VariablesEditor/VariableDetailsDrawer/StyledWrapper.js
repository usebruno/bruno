import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: ${(props) => props.theme.bg};
  border-left: 1px solid ${(props) => props.theme.border.border0};

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid ${(props) => props.theme.border.border0};
    flex-shrink: 0;
    min-height: 40px;
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.base};

    .var-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .section-badge {
      flex-shrink: 0;
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
      font-weight: 400;
    }
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 4px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.sidebar.bg};
    }
  }

  .panel-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
`;

export default StyledWrapper;
