import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-width: 800px;

  span.beta-tag {
    display: flex;
    align-items: center;
    padding: 0.1rem 0.25rem;
    font-size: 0.75rem;
    border-radius: 0.25rem;
    color: ${(props) => props.theme.colors.text.green};
    border: solid 1px ${(props) => props.theme.colors.text.green} !important;
  }

  span.developer-mode-warning {
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.yellow};
  }

  div.tabs {
    div.tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: 1.25rem;
      color: var(--color-tab-inactive);
      cursor: pointer;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &.active {
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
`;

export default StyledWrapper;
