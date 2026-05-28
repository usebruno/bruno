import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${(props) => props.theme.bg};

  .header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 8px 20px;
    flex-shrink: 0;

    .title {
      font-size: ${(props) => props.theme.font.size.base};
      font-weight: 500;
      color: ${(props) => props.theme.text};
      margin: 0;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .view-toggle {
        display: flex;
        border: 1px solid ${(props) => props.theme.border.border0};
        border-radius: 4px;
        overflow: hidden;

        .toggle-btn {
          padding: 4px 12px;
          font-size: 12px;
          border: none;
          background: transparent;
          color: ${(props) => props.theme.colors.text.muted};
          cursor: pointer;
          transition: all 0.15s ease;

          &:first-child {
            border-right: 1px solid ${(props) => props.theme.border.border0};
          }

          &:hover {
            background: ${(props) => props.theme.sidebar.bg};
          }

          &.active {
            background: ${(props) => props.theme.brand};
            color: ${(props) => props.theme.bg};
          }
        }
      }

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border: none;
        background: transparent;
        color: ${(props) => props.theme.colors.text.muted};
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.15s ease;

        &:hover {
          background: ${(props) => props.theme.sidebar.bg};
          color: ${(props) => props.theme.text};
        }

        &.delete-btn:hover {
          color: ${(props) => props.theme.colors.text.danger};
        }
      }
    }
  }

  .content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0 20px 20px 20px;
  }
`;

export default StyledWrapper;
