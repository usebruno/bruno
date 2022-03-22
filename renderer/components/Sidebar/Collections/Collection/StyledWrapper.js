import styled from 'styled-components';

const Wrapper = styled.div`
  .collection-name {
    height: 1.875rem;
    cursor: pointer;
    user-select: none;
    padding-left: 8px;
    font-weight: 600;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    .collection-actions {
      .dropdown {
        div[aria-expanded="true"] {
          visibility: visible;
        }
        div[aria-expanded="false"] {
          visibility: hidden;
        }
      }
      

      svg {
        height: 22px;
        color: rgb(110 110 110);
      }
    }

    &:hover {
      .collection-actions {
        .dropdown {
          div[aria-expanded="false"] {
            visibility: visible;
          }
        }
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
