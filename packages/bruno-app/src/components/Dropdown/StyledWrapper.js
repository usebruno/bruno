import styled from 'styled-components';

const Wrapper = styled.div`
  .dropdown-toggle {
    &:hover {
      color: black;
    }
  }

  .tippy-box {
    min-width: 135px;
    font-size: 0.8125rem;
    color: ${(props) => props.theme.dropdown.color};
    background-color: ${(props) => props.theme.dropdown.bg};
    box-shadow: ${(props) => props.theme.dropdown.shadow};
    border-radius: 3px;

    .tippy-content {
      padding-left: 0;
      padding-right: 0;
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;

      .label-item {
        display: flex;
        align-items: center;
        padding: 0.35rem 0.6rem;
      }

      .dropdown-item {
        display: flex;
        align-items: center;
        padding: 0.35rem 0.6rem;
        cursor: pointer;

        &:hover {
          background-color: ${(props) => props.theme.dropdown.hoverBg};
        }
      }
    }
  }
`;

export default Wrapper;
