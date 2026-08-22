import styled from 'styled-components';

const StyledWrapper = styled.div`
  .markdown-body {
    height: auto !important;
    overflow-y: visible !important;
  }
  div.tabs {
    .tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      background: transparent;
      font: inherit;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      color: ${(props) => props.theme.colors.text.subtext0};
      cursor: pointer;

      &:focus,
      &:active,
      &:focus-within,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:focus-visible {
        outline: 2px solid ${(props) => props.theme.primary.solid} !important;
        outline-offset: 2px;
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
