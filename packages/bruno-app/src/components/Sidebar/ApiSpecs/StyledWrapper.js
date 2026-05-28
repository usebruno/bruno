import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;

  .api-specs-list {
    flex: 1 1 0%;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: 4px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .api-spec-item {
    height: 1.6rem;
    cursor: pointer;
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

  .placeholder {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
