import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;

  &.collapsed {
    flex-shrink: 0;

    .section-content {
      display: none;
    }
  }

  &.expanded {
    flex: 1;
    min-height: 0;
    overflow: hidden;

    .section-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    border-radius: 4px;
    transition: background 0.15s ease;
    flex-shrink: 0;

    &:hover {
      background: ${(props) => props.theme.workspace.button.bg};
    }

    .section-title-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-icon {
      color: ${(props) => props.theme.colors.text.muted};
      transition: transform 0.2s ease;

      &.expanded {
        transform: rotate(90deg);
      }
    }

    .section-title {
      padding-right: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${(props) => props.theme.sidebar.color};
    }

    .section-badge {
      font-size: 10px;
      padding: 1px 6px;
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      border-radius: 10px;
      color: ${(props) => props.theme.colors.text.muted};
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 2px;

      .btn-action {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 4px;
        color: ${(props) => props.theme.colors.text.muted};
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
          color: ${(props) => props.theme.text};
        }
      }
    }
  }

  .section-content {
    padding: 4px 0;
  }
`;

export default StyledWrapper;
