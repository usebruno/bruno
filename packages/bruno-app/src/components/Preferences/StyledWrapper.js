import styled from 'styled-components';

const StyledWrapper = styled.div`
  .modal-content {
    min-height: 500px;
  }

  div.tabs {
    min-width: 200px;
    background: ${(props) => props.theme.modal.body.bg};
    height: 100%;

    div.tab {
      width: 100%;
      padding: 8px 16px;
      cursor: pointer;
      color: ${(props) => props.theme.text};
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }

      &.active {
        background: ${(props) => props.theme.sidebar.collection.item.bg};
        color: ${(props) => props.theme.text};

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: ${(props) => props.theme.colors.text.yellow};
        }

        &:hover {
          background: ${(props) => props.theme.sidebar.collection.item.bg};
        }
      }

      svg {
        width: 18px;
        height: 18px;
      }
    }
  }

  section.tab-panel {
    flex: 1;
    padding: 20px;
    background: ${(props) => props.theme.modal.body.bg};
    overflow-y: auto;
    height: 100%;
  }
`;

export default StyledWrapper;
