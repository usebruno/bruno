import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  
  .table-container {
    overflow-y: auto;
    border-radius: 8px;
    border: ${(props) => props.theme.workspace.environments.indentBorder};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;

    td {
      vertical-align: middle;
      padding: 2px 10px;

      &:nth-child(1) {
        width: 25px;
        border-right: none;
      }
      &:nth-child(4) {
        width: 80px;
      }
      &:nth-child(5) {
        width: 60px;
      }

      &:nth-child(2) {
        width: 30%;
      }
    }

    thead {
      color: ${(props) => props.theme.table.thead.color} !important;
      background: ${(props) => props.theme.sidebar.bg};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
      
      td {
        padding: 5px 10px !important;
        border-bottom: ${(props) => props.theme.workspace.environments.indentBorder};
        border-right: ${(props) => props.theme.workspace.environments.indentBorder};
        
        &:last-child {
          border-right: none;
        }
      }
    }
    
    tbody {
      tr {
        transition: background 0.1s ease;
        
        &:last-child td {
          border-bottom: none;
        }
        
        td {
          border-bottom: ${(props) => props.theme.workspace.environments.indentBorder};
          border-right: ${(props) => props.theme.workspace.environments.indentBorder};
          
          &:last-child {
            border-right: none;
          }
        }
      }
    }
  }

  .tooltip-mod {
    font-size: 11px !important;
    max-width: 200px !important;
  }

  input[type='text'] {
    width: 100%;
    border: 1px solid transparent;
    outline: none !important;
    background-color: transparent;
    color: ${(props) => props.theme.text};
    padding: 0;
    border-radius: 4px;
    transition: all 0.15s ease;

    &:focus {
      outline: none !important;
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    width: 14px;
    height: 14px;
    accent-color: ${(props) => props.theme.colors.accent};
    vertical-align: middle;
    margin: 0;
  }
  
  .button-container {
    flex-shrink: 0;
    display: flex;
    gap: 8px;
  }
`;

export default Wrapper;
