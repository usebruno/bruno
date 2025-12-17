import styled from 'styled-components';

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

    /* Expanded sections grow to fill available space but are constrained */
    .sidebar-section.expanded {
      flex: 1 1 0%;
      min-height: 0;

      .section-header {
        border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }
    }

    /* Single expanded section: add margin-bottom to push others down */
    .sidebar-section.single-expanded {
      margin-bottom: auto !important;
      flex: 1 1 0% !important;
      min-height: 0;
      max-height: 100%;
    }

    /* Multiple expanded sections: equal split, no margin-bottom */
    .sidebar-section.multi-expanded {
      margin-bottom: 0;
      flex: 1 1 0% !important;

      min-height: 0;
      overflow: hidden;
      max-height: 100%;
    }

    /* Collapsed sections only take header height */
    .sidebar-section:not(.expanded) {
      flex: 0 0 auto;
    }

    /* Always push bottom accordions wrapper to the bottom */
    .bottom-accordions-wrapper {
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
    }

    /* Generic accordion section wrapper - applies to all accordion sections */
    .accordion-section-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 0;
      position: relative;
      overflow: visible;
    }

    /* Add border-top to all accordion items except the first child */
    .accordion-section-wrapper:not(:first-child) {
      border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    /* When a section is single expanded, wrapper should fill space but respect pinned sections */
    .accordion-section-wrapper.single-expanded-wrapper {
      flex: 1 1 0% !important;
      min-height: 0;
      overflow: hidden;
    }

    /* Normal flow: sections not pinned and not multi-expanded */
    .accordion-section-wrapper:not(.pinned-to-bottom):not(.multi-expanded) {
      flex: 0 0 auto;
    }

    /* When a section is pinned to bottom */
    .accordion-section-wrapper.pinned-to-bottom {
      flex: 0 0 auto;
      margin-top: auto;
    }

    /* When multiple sections are expanded, split space equally */
    .accordion-section-wrapper.multi-expanded {
      flex: 1 1 0% !important;
      min-height: 0;
      margin-top: 0 !important;
      height: auto !important;
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

  .second-tab-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: ${(props) => props.theme.sidebar.muted};
  }
`;

export default Wrapper;
