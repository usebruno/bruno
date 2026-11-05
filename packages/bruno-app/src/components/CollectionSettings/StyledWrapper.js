import styled from 'styled-components';

const StyledWrapper = styled.div`
  .markdown-body {
    height: auto !important;
    overflow-y: visible !important;
  }
  div.tabs {
    div.tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      color: ${(props) => props.theme.colors.text.subtext0};
      cursor: pointer;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:hover {
        color: ${(props) => props.theme.tabs.active.color} !important;
      }

      &.active {
        font-weight: ${(props) =>
          props.theme.tabs.active.fontWeight} !important;
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }
    }
  }
  /* Settings tab: the divider runs under the tabs and the sidebar border starts from it */
  .settings-tab-bar.with-divider {
    /* The wrapper drops its side padding on this tab, so the line runs edge to edge; keep tabs in place */
    padding-inline: 16px;
    border-bottom: 1px solid ${(props) => props.theme.border.border0};

    div.tabs div.tab {
      margin-bottom: -1px;
    }
  }

  table {
    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};

      li {
        background-color: ${(props) => props.theme.bg} !important;
      }
    }
  }

  .muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  input[type="radio"] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }
`;

export default StyledWrapper;
