import styled from 'styled-components';

const Wrapper = styled.div`
  .menu-icon {
    display: none;
    flex-grow: 1;
    justify-content: flex-end;
  }

  .collection-item-name {
    height: 1.875rem;
    cursor: pointer;
    user-select: none;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    &:hover {
      background: #f7f7f7;
      .menu-icon {
        display: flex;
      }
    }

    .menu-icon {
      color: rgb(110 110 110);
    }

    &.item-focused-in-tab {
      background: #2383e0;
      color: white;

      &:hover {
        background: #2383e0 !important;
        color: white !important;
      }

      .menu-icon {
        color: white !important;
      }
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
    }
  }
`;

export default Wrapper;
