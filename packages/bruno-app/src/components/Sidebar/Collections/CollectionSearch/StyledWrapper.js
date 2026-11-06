import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin: 4px 10px 8px 10px;

  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 8px 0 10px;
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    border: 1px solid transparent;
    border-radius: 6px;
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.input.border};
    }

    &:focus-within {
      background: ${(props) => props.theme.input.bg};
      border-color: ${(props) => props.theme.input.border};
    }
  }

  .search-icon,
  .indexing-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.sidebar.muted};
    pointer-events: none;
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0 0 0 4px;
    font-size: 12px;
    color: ${(props) => props.theme.sidebar.color};
    background: transparent;
    border: none;
    outline: none;

    &::placeholder {
      color: ${(props) => props.theme.sidebar.muted};
    }
  }

  .match-count {
    flex-shrink: 0;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${(props) => props.theme.sidebar.muted};
  }

  .clear-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    color: ${(props) => props.theme.sidebar.muted};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.sidebar.color};
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }
`;

export default StyledWrapper;
