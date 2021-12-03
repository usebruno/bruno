import styled from 'styled-components';

const Wrapper = styled.div`
  .dropdown-toggle {
    &:hover {
      color: black;
    }
  }

  .tippy-box {
    min-width: 135px;
    background-color: white;
    color: rgb(82 82 82);
    box-shadow: rgb(50 50 93 / 25%) 0px 6px 12px -2px, rgb(0 0 0 / 30%) 0px 3px 7px -3px;

    .tippy-content {
      padding-left: 0;
      padding-right: 0;

      .dropdown-item {
        display: flex;
        align-items: center;
        padding: .3rem .5rem;
        cursor: pointer;

        &:hover {
          background-color: #eee;
        }
      }
    }
  }
`;

export default Wrapper;
