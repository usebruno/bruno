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
    max-height: 90vh;
    overflow-y: auto;

    .tippy-content {
      padding-left: 0;
      padding-right: 0;
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;

      .label-item {
        display: flex;
        align-items: center;
        padding: 0.35rem 0.6rem;
        background-color: ${(props) => props.theme.dropdown.labelBg};
      }

      .dropdown-item {
        display: flex;
        align-items: center;
        padding: 0.35rem 0.6rem;
        cursor: pointer;

        &.active {
          color: ${(props) => props.theme.colors.text.yellow} !important;
          .icon {
            color: ${(props) => props.theme.colors.text.yellow} !important;
          }
        }

        .icon {
          color: ${(props) => props.theme.dropdown.iconColor};
        }

        &:hover:not(:disabled) {
          background-color: ${(props) => props.theme.dropdown.hoverBg};
        }

        &:disabled {
          cursor: not-allowed;
          color: gray;
        }

        &.border-top {
          border-top: solid 1px ${(props) => props.theme.dropdown.separator};
        }
      }
    }
  }
`;

export default Wrapper;
