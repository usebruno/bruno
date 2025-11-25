import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    border-bottom: 1px solid ${(props) => props.theme.requestTabs?.bottomBorder || props.theme.modal?.input?.border || 'rgba(0, 0, 0, 0.1)'};
    margin-bottom: 0;
    padding-bottom: 0;
    padding-left: 20px;
    padding-right: 20px;
    position: relative;

    div.tab {
      padding: 10px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: 0;
      color: var(--color-tab-inactive);
      cursor: pointer;
      font-size: 12px;
      font-weight: 400;
      transition: all 0.2s ease;
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:hover {
        color: ${(props) => props.theme.text};
      }

      &.active {
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
        font-weight: 500;
      }
    }
  }

  section {
    padding-top: 24px;
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
`;

export default StyledWrapper;
