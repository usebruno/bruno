import styled from 'styled-components';
import { rgba } from 'polished';
import { MIN_SECTION_PX } from './sidebarSectionSizing';

const Wrapper = styled.div`
  color: ${(props) => props.theme.sidebar.color};
  max-height: 100%;

  .collection-name.collection-selected,
  .collection-item-name.collection-item-selected {
    background: ${(props) => rgba(props.theme.primary.text, 0.1)};

    &:hover {
      background: ${(props) => rgba(props.theme.primary.text, 0.16)} !important;
    }
  }

  /* Highlight for selected collection items */
  .collection-item-name.collection-item-selected {
    border-left: 3px solid ${(props) => props.theme.primary.solid};
  }

  /* Highlight for selected collections */
  /* We use box-shadow here to prevent visual breaks (mitered corners) with top/bottom drag borders */
  .collection-name.collection-selected {
    border-left-width: 0 !important;
    padding-left: 8px !important;
    box-shadow: inset 3px 0 0 0 ${(props) => props.theme.primary.solid};
  }

  /* Keyboard focus + Selected */
  .collection-name.collection-selected.collection-keyboard-focused,
  .collection-item-name.collection-item-selected.item-keyboard-focused {
    background: ${(props) => rgba(props.theme.primary.text, 0.1)} !important;
    &:hover {
      background: ${(props) => rgba(props.theme.primary.text, 0.16)} !important;
    }

  }

  /* Tab focus + Selected */
  .collection-name.collection-selected.collection-focused-in-tab,
  .collection-item-name.collection-item-selected.item-focused-in-tab {
    background: ${(props) => rgba(props.theme.primary.text, 0.16)} !important;
    &:hover {
      background: ${(props) => rgba(props.theme.primary.text, 0.16)} !important;
    }

  }

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
      width: 2px;
      height: 100%;
      border-left: solid 1px ${(props) => props.theme.sidebar.dragbar.border};
    }

    &:hover div.drag-request-border {
      border-left: solid 1px ${(props) => props.theme.sidebar.dragbar.activeBorder};
    }
  }
`;

export default Wrapper;
