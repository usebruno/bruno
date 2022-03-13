import styled from 'styled-components';

const Wrapper = styled.div`
  .collection-name {
    height: 1.875rem;
    cursor: pointer;
    user-select: none;
    padding-left: 8px;
    padding-right: 8px;
    font-weight: 600;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    .collection-actions {
      display: none;
      flex-grow: 1;
      justify-content: flex-end;

      svg {
        height: 22px;
        color: rgb(110 110 110);
      }
    }

    &:hover {
      .collection-actions {
        display: flex;
      }
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
      font-weight: 400;
    }
  }
`;

export default Wrapper;
