import styled from 'styled-components';

const Wrapper = styled.aside`
  min-width: 270px;
  width: 270px;
  /* background-color: #F6F8FA; */
  background-color: var(--color-sidebar-background);

  .collection-title {
    line-height: 1.5;
    .collection-dropdown {
      .dropdown-icon {
        display: none;
        color: rgb(110 110 110);
      }
    }

    &:hover {
      background: #f7f7f7;
      .dropdown-icon {
        display: flex;
      }
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
    }
  }
`;

export default Wrapper;
