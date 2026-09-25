import styled from 'styled-components';

const StyledWrapper = styled.div`
  .try-row {
    display: flex;
    align-items: stretch;
    gap: 10px;
    height: 1.875rem;
  }

  .try-url-bar {
    flex: 1;
    min-width: 0;

    > div {
      height: 100%;
    }

    .url-bar-container {
      height: 100%;
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .try-action {
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
  }

  .try-action > div {
    display: flex;
    align-items: stretch;
  }

  .try-action button {
    height: 100%;
  }

  .try-main button {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .try-caret {
    height: 100%;
  }

  .try-caret button {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    margin-left: -1px;
    padding-left: 6px;
    padding-right: 6px;
  }

  .demo-hint {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
    margin-bottom: 0.75rem;
  }

  .demo-section {
    margin-bottom: 1rem;
  }

  .demo-section-title {
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
    margin-bottom: 0.375rem;
  }

  .demo-table {
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: 4px;
    border-collapse: collapse;
    font-size: ${(props) => props.theme.font.size.sm};

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-weight: 500;
      text-align: left;
    }

    th,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
      padding: 4px 8px;
      word-break: break-all;
    }

    tbody tr:nth-child(odd) {
      background-color: ${(props) => props.theme.table.striped};
    }
  }

  .demo-body {
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: 4px;
    padding: 8px;
    font-size: ${(props) => props.theme.font.size.sm};
    white-space: pre-wrap;
    word-break: break-all;
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
        font-weight: ${(props) => props.theme.tabs.active.fontWeight} !important;
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }
    }
  }
`;

export default StyledWrapper;
