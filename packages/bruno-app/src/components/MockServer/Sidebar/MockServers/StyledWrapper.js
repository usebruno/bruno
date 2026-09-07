import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;

  .mock-servers-list {
    flex: 1 1 0%;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: 4px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .mock-server-item,
  .mock-response-item {
    height: 1.6rem;
    cursor: pointer;
    user-select: none;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    .mock-server-actions {
      visibility: hidden;
    }

    &:hover,
    &:focus-within {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};

      .mock-server-actions {
        visibility: visible;
        background-color: transparent !important;
      }
    }
  }

  .mock-server-item {
    padding-left: 4px;
  }

  .empty-mock-server-message {
    display: flex;
    align-items: center;
    height: 1.6rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.sidebar.muted};
  }

  .placeholder {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
