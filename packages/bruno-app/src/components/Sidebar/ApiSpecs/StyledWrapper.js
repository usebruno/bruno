import styled from 'styled-components';

const Wrapper = styled.div`
  .api-spec-item {
    &.active {
      background: ${(props) => props.theme.sidebar.collection.item.bg};
    }
    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      .menu-icon {
        .dropdown {
          div[aria-expanded='false'] {
            visibility: visible;
          }
        }
      }
    }
  }

  .menu-icon {
    cursor: pointer;
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};

    .dropdown {
      div[aria-expanded='true'] {
        visibility: visible;
      }
      div[aria-expanded='false'] {
        visibility: hidden;
      }
    }
  }

  div.tippy-box {
    position: relative;
    top: -0.625rem;
  }

  div.dropdown-item.close-item {
    color: ${(props) => props.theme.colors.danger};
    &:hover {
      background-color: ${(props) => props.theme.colors.bg.danger};
      color: white;
    }
  }

  .placeholder {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
