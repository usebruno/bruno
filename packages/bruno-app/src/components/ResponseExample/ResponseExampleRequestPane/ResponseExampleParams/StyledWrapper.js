import styled from 'styled-components';

const StyledWrapper = styled.div`
  .title {
    font-weight: 700;
    color: ${(props) => props.theme.text};
  }
  
  .btn-action {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: opacity 0.2s ease;
    color: ${(props) => props.theme.colors.text.muted};
    
    &:hover {
      opacity: 0.8;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    
    thead {
      td {
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 8px 0;
        border-bottom: 1px solid ${(props) => props.theme.table.border};
      }
    }
    
    tbody {
      tr {
        border-bottom: 1px solid ${(props) => props.theme.table.border};
        
        &:hover {
          background: ${(props) => props.theme.plainGrid.hoverBg};
        }
      }
    }
  }
  

  tr {
    position: relative;
    
    &:hover .delete-button {
      opacity: 1;
      visibility: visible;
    }
  }

  .delete-button {
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    margin-left: 8px;
    
    &:hover {
      color: ${(props) => props.theme.colors.text.red};
    }

    svg {
      width: 16px;
      height: 16px;
      color: ${(props) => props.theme.text};
    }
  }
  
`;

export default StyledWrapper;
