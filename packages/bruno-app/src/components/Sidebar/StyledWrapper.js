import styled from 'styled-components';
import { MIN_SECTION_PX } from './sidebarSectionSizing';

const Wrapper = styled.div`
  color: ${(props) => props.theme.sidebar.color};
  max-height: 100%;

  aside {
    background-color: ${(props) => props.theme.sidebar.bg};
    overflow: hidden;

    .sidebar-sections-container {
      display: flex;
      flex-direction: column;
    }

    .sidebar-sections {
      min-height: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .sidebar-section.expanded {
      flex: 1 1 0%;
      min-height: 0;

      .section-header {
        border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }
    }

    .sidebar-section:not(.expanded) {
      flex: 0 0 auto;
    }

    .bottom-accordions-wrapper {
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
    }

    .accordion-section-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 0;
      position: relative;
      overflow: visible;
    }

    .accordion-section-wrapper:not(:first-child) {
      border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    .accordion-section-wrapper.expanded-wrapper {
      min-height: ${MIN_SECTION_PX}px;
      overflow: hidden;
    }

    .accordion-section-wrapper:not(.expanded-wrapper) {
      flex: 0 0 auto;
    }

  }

  div.sidebar-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    cursor: col-resize;
    background-color: transparent;
    width: 6px;
    right: -3px;
    transition: opacity 0.2s ease;

    div.drag-request-border {
      width: 1px;
      height: 100%;
      border-left: solid 1px ${(props) => props.theme.sidebar.dragbar.border};
    }

    &:hover div.drag-request-border {
      width: 1px;
      height: 100%;
      border-left: solid 1px ${(props) => props.theme.sidebar.dragbar.activeBorder};
    }
  }
`;

export default Wrapper;
