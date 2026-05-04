import styled from 'styled-components';

const Wrapper = styled.div`
  .git-collection-row {
    display: flex;
    align-items: center;
    height: 1.6rem;
    cursor: pointer;
    user-select: none;
    padding-left: 4px;
    color: ${(props) => props.theme.sidebar.muted};
    opacity: 0.7;

    .git-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: ${(props) => props.theme.sidebar.muted};
    }

    .git-collection-name {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      padding-left: 6px;
    }

    .collection-actions {
      visibility: hidden;
    }

    &:hover,
    &:focus-within {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      opacity: 0.9;

      .collection-actions {
        visibility: visible;
        background-color: transparent !important;
      }
    }
  }
`;

export default Wrapper;
