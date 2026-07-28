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
    position: relative;

    .menu-icon {
      color: ${(props) => props.theme.sidebar.dropdownIcon.color};
      visibility: hidden;
    }

    .api-spec-item-menu-icon {
      visibility: hidden;
    }

    &.active {
      background: ${(props) => props.theme.sidebar.collection.item.bg};
    }

    &:hover,
    &.menu-open {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.menu-open {
      border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
      border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
      outline: none;
    }

    &:hover,
    &.active,
    &.menu-open {
      .menu-icon,
      .api-spec-item-menu-icon {
        visibility: visible;
        background-color: transparent !important;
      }
    }
  }

  .placeholder {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
