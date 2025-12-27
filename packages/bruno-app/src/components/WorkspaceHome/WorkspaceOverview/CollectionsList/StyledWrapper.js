import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  overflow-y: auto;

  .collections-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    text-align: center;
  }

  .empty-icon {
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 12px;
  }

  .empty-title {
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 6px;
  }

  .empty-description {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }
  }

  .collection-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .collection-info {
    flex: 1;
    min-width: 0;
  }

  .collection-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 1px;
  }

  .collection-name {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collection-path {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collection-menu {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .collection-dropdown {
    min-width: 120px;
  }
`;

export default StyledWrapper;
