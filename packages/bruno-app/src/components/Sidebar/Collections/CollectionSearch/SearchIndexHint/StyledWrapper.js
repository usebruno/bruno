import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin-top: 6px;

  .index-hint-banner {
    display: flex;
    align-items: center;
    height: 28px;
    padding: 0 6px 0 8px;
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    border-radius: 6px;
  }

  .index-hint-copy {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
    font-size: 11px;
    line-height: 1;
    white-space: nowrap;
    color: ${(props) => props.theme.sidebar.color};

    .index-hint-info {
      display: flex;
      flex-shrink: 0;
      color: ${(props) => props.theme.sidebar.muted};
      cursor: pointer;
    }
  }

  .index-hint-dismiss {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 4px;
    color: ${(props) => props.theme.sidebar.muted};
    background: transparent;
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.sidebar.color};
      background: ${(props) => props.theme.sidebar.collection.item.bg};
    }
  }
`;

export default StyledWrapper;
