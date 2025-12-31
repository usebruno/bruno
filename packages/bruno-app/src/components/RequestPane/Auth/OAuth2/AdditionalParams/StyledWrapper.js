import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .oauth2-icon-container {
    background-color: ${(props) => rgba(props.theme.primary.solid, 0.1)};
  }

  .oauth2-icon {
    color: ${(props) => props.theme.primary.solid};
  }

  &.oauth2-additional-params-wrapper div.tabs {
    div.tab {
      cursor: pointer;
      padding: 4px 8px !important;
      font-size: ${(props) => props.theme.font.size.sm};
      border-radius: 4px;
      border: none !important;
      border-bottom: none !important;
      margin-right: 0;
      
      &:hover {
        background-color: ${(props) => rgba(props.theme.primary.solid, 0.1)};
      }
      
      &.active {
        background-color: ${(props) => {
          return props.theme.mode === 'dark'
            ? rgba(props.theme.primary.solid, 0.2)
            : rgba(props.theme.primary.solid, 0.1);
        }};
        color: ${(props) => props.theme.primary.solid} !important;
        border-bottom: none !important;
        font-weight: normal !important;
      }
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 500;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
    }
    td {
      padding: 6px 10px;
    }
  }
  
  .additional-parameter-sends-in-selector {
    select {
      height: 32px;
      width: 100%;
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: 4px;
      padding: 0 8px;
      
      &:focus {
        outline: none;
        border-color: ${(props) => props.theme.primary.solid};
      }
    }
  }
  
  .add-additional-param-actions {
    &:hover {
      color: ${(props) => props.theme.primary.solid};
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }
`;

export default StyledWrapper;
