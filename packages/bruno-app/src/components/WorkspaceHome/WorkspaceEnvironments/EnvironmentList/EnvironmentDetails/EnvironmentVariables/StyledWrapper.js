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
    font-size: 12px;

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
      color: ${(props) => props.theme.colors.text};
      background: ${(props) => props.theme.sidebar.bg};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
      
      td {
        padding: 8px 10px;
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

  .btn-add-param {
    font-size: 12px;
    color: ${(props) => props.theme.textLink};
    font-weight: 500;
    padding: 7px 14px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    border: ${(props) => props.theme.sidebar.collection.item.indentBorder};
    background: transparent;
    transition: all 0.15s ease;
    
    &:hover {
      background: ${(props) => props.theme.listItem.hoverBg};
      border-color: ${(props) => props.theme.textLink};
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
    font-size: 12px;
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
    accent-color: ${(props) => props.theme.workspace.accent};
    vertical-align: middle;
    margin: 0;
  }
  
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 4px;
    transition: color 0.15s ease, background 0.15s ease;
  }
  
  .button-container {
    padding: 12px 0;
    background: ${(props) => props.theme.bg};
    flex-shrink: 0;
    display: flex;
    gap: 8px;
  }
  
  .submit {
    padding: 7px 16px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    background: ${(props) => props.theme.workspace.accent};
    color: ${(props) => props.theme.bg};
    cursor: pointer;
    transition: opacity 0.15s ease;
    
    &:hover {
      opacity: 0.9;
    }
  }

  .reset {
    background: transparent;
    padding: 6px 16px;
    border: 1px solid ${(props) => props.theme.workspace.accent};
    color: ${(props) => props.theme.workspace.accent};
    &:hover {
      opacity: 0.9;
    }
  }
  
  .discard {
    padding: 7px 16px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 6px;
    background: transparent;
    color: ${(props) => props.theme.text};
    border: ${(props) => props.theme.sidebar.collection.item.indentBorder};
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }
`;

export default Wrapper;
