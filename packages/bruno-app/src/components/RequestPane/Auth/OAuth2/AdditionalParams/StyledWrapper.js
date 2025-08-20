import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs {
    .tab {
      cursor: pointer;
      padding: 4px 8px !important;
      font-size: 12px;
      border-radius: 4px;
      
      &:hover {
        background-color: ${(props) => props.theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
      }
      
      &.active {
        background-color: ${(props) => props.theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'};
        color: ${(props) => props.theme.mode === 'dark' ? '#6366f1' : '#4f46e5'};
        font-weight: 500;
      }
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 600;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
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
        border-color: ${(props) => props.theme.mode === 'dark' ? '#6366f1' : '#4f46e5'};
      }
    }
  }
  
  .add-additional-param-actions {
    &:hover {
      color: ${(props) => props.theme.mode === 'dark' ? '#6366f1' : '#4f46e5'};
    }
  }
`

export default StyledWrapper;