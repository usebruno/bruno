import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;

  .search-input {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: ${(props) => props.theme.sidebar.collection.item.bg};
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid transparent;

    &:focus-within {
      border-color: ${(props) => props.theme.brand};
    }

    input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: ${(props) => props.theme.colors.text.primary};
      font-size: ${(props) => props.theme.font.size.sm};

      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
      }
    }

    svg {
      color: ${(props) => props.theme.colors.text.muted};
      flex-shrink: 0;
    }
  }

  .file-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.scrollbar.color};
      border-radius: 2px;
    }
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.selected {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    .checkbox {
      width: 16px;
      height: 16px;
      border: 1.5px solid ${(props) => props.theme.colors.text.muted};
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s ease;

      &.checked {
        background: ${(props) => props.theme.brand};
        border-color: ${(props) => props.theme.brand};

        &::after {
          content: '';
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translateY(-1px);
        }
      }
    }

    .method-badge {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 4px;
      border-radius: 3px;
      flex-shrink: 0;
      min-width: 32px;
      text-align: center;

      &.get { color: ${(props) => props.theme.request.methods.get}; }
      &.post { color: ${(props) => props.theme.request.methods.post}; }
      &.put { color: ${(props) => props.theme.request.methods.put}; }
      &.delete { color: ${(props) => props.theme.request.methods.delete}; }
      &.patch { color: ${(props) => props.theme.request.methods.patch}; }
      &.head, &.options { color: ${(props) => props.theme.colors.text.muted}; }
    }

    .file-name {
      flex: 1;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.primary};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .folder-path {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100px;
    }
  }

  .folder-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.colors.text.primary};
    }

    svg {
      flex-shrink: 0;
    }
  }

  .selection-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;

    .selection-count {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
    }

    .clear-btn {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.brand};
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: ${(props) => props.theme.border.radius.sm};

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }
    }
  }

  .empty-state {
    padding: 20px;
    text-align: center;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
  }
`;

export default StyledWrapper;
