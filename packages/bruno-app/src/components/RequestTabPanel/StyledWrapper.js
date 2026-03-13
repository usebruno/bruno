import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.dragging {
    cursor: col-resize;

    &.vertical-layout {
      cursor: row-resize;
    }
  }

  .request-pane {
    flex-shrink: 0;
  }

  .response-pane {
    min-width: 0;
  }

  div.dragbar-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    min-width: 10px;
    padding: 0;
    cursor: col-resize;
    background: transparent;
    position: relative;

    div.dragbar-handle {
      display: flex;
      height: 100%;
      width: 1px;
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
    }

    &:hover div.dragbar-handle {
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }

  &.vertical-layout {
    .request-pane {
      padding-bottom: 0.5rem;
    }

    .response-pane {
      padding-top: 0.5rem;
    }

    div.dragbar-wrapper {
      width: 100%;
      height: 10px;
      cursor: row-resize;
      padding: 0 1rem;
      position: relative;

      div.dragbar-handle {
        width: 100%;
        height: 1px;
        border-left: none;
        border-top: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
      }

      &:hover div.dragbar-handle {
        border-left: none;
        border-top: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
      }
    }
  }

  div.graphql-docs-explorer-container {
    background: ${(props) => props.theme.requestTabPanel.graphqlDocsExplorer.bg};
    color: ${(props) => props.theme.requestTabPanel.graphqlDocsExplorer.color};
    outline: none;
    box-shadow: rgb(0 0 0 / 15%) 0px 0px 8px;
    position: absolute;
    right: 0px;
    z-index: 2000;
    width: 350px;
    height: 100%;

    .doc-explorer-contents,
    .doc-explorer,
    .search-box > input,
    .search-box-clear {
      background-color: ${(props) => props.theme.requestTabPanel.graphqlDocsExplorer.bg};
      color: ${(props) => props.theme.requestTabPanel.graphqlDocsExplorer.color};
    }

    div.doc-explorer-title {
      text-align: left;
    }

    div.doc-explorer-rhs {
      display: flex;
    }

    // GraphQL docs color overrides
    .doc-explorer-back {
      color: ${(props) => props.theme.textLink};

      &:before {
        border-left-color: ${(props) => props.theme.textLink};
        border-top-color: ${(props) => props.theme.textLink};
      }
    }

    .doc-explorer-contents {
      border-top-color: ${(props) => props.theme.border.border2};
    }

    .doc-type-description code,
    .doc-category code {
      color: ${(props) => props.theme.codemirror.tokens.keyword};
      background-color: ${(props) => props.theme.background.surface0};
      border-color: ${(props) => props.theme.border.border1};
    }

    .doc-category-title {
      border-bottom-color: ${(props) => props.theme.border.border1};
      color: ${(props) => props.theme.colors.text.muted};
    }

    .doc-category-item {
      color: ${(props) => props.theme.colors.text.subtext2};
    }

    .keyword {
      color: ${(props) => props.theme.codemirror.tokens.property};
    }

    .type-name {
      color: ${(props) => props.theme.codemirror.tokens.atom};
    }

    .field-name {
      color: ${(props) => props.theme.codemirror.tokens.property};
    }

    .field-short-description {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .enum-value {
      color: ${(props) => props.theme.textLink};
    }

    .arg-name {
      color: ${(props) => props.theme.colors.text.purple};
    }

    .arg-default-value {
      color: ${(props) => props.theme.colors.text.green};
    }

    .doc-deprecation {
      background: ${(props) => props.theme.status.warning.background};
      box-shadow: inset 0 0 1px ${(props) => props.theme.status.warning.border};
      color: ${(props) => props.theme.colors.text.muted};

      &:before {
        color: ${(props) => props.theme.status.warning.text};
      }
    }

    .show-btn {
      border-color: ${(props) => props.theme.border.border2};
      background: ${(props) => props.theme.background.surface0};
      color: ${(props) => props.theme.text};
    }

    .search-box {
      border-bottom-color: ${(props) => props.theme.border.border1};
    }

    .search-box-clear {
      background-color: ${(props) => props.theme.overlay.overlay1};
      color: ${(props) => props.theme.colors.text.white};

      &:hover {
        background-color: ${(props) => props.theme.overlay.overlay2};
      }
    }
  }

  .variables-section {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .variables-header {
    display: flex;
    align-items: center;
    padding: 3px 10px;
    cursor: pointer;
    user-select: none;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
    gap: 4px;
    flex-shrink: 0;

    &:hover {
      color: ${(props) => props.theme.text};
    }

    .variables-chevron {
      display: flex;
      align-items: center;
      opacity: 0.6;
    }
  }

  .variables-dragbar {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 10px;
    cursor: row-resize;
    flex-shrink: 0;
    position: relative;

    &::after {
      content: '';
      display: block;
      width: 100%;
      height: 1px;
      border-top: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
    }

    &:hover::after {
      border-top: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }

  div.graphql-query-builder-container {
    height: 100%;
    flex-shrink: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  div.query-builder-dragbar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    min-width: 10px;
    cursor: col-resize;
    background: transparent;
    position: relative;
    flex-shrink: 0;

    &::after {
      content: '';
      display: block;
      height: 100%;
      width: 1px;
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
    }

    &:hover::after {
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }

  .graphql-menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.25rem;
    width: 1.5rem;
    border: 1px solid ${(props) => props.theme.workspace.border};
    color: ${(props) => props.theme.dropdown.iconColor};
    border-radius: 4px;

    &:hover {
      border-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.hoverBorder} !important;
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
