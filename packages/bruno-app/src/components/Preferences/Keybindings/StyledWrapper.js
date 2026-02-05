import styled from 'styled-components';

const StyledWrapper = styled.div`
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
  -ms-overflow-style: none;

  table {
    width: 100%;
    border-collapse: collapse;

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    td {
      padding: 6px 10px;
      font-size: ${(props) => props.theme.font.size.sm};
      border-top: 1px solid ${(props) => props.theme.table.border};
      border-left: 1px solid ${(props) => props.theme.table.border};
      border-right: 1px solid ${(props) => props.theme.table.border};
    }

    thead th {
      font-weight: 500;
      padding: 10px;
      text-align: left;
      border-left: 1px solid ${(props) => props.theme.table.border};
      border-right: 1px solid ${(props) => props.theme.table.border};
      border-bottom: 1px solid ${(props) => props.theme.table.border};
    }
  }

  .table-container {
    height: 100%; 
    max-height: inherit; 
    
    overflow-y: auto;
    border-radius: 8px;
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-bottom: 1px solid ${(props) => props.theme.table.border};

    &::-webkit-scrollbar {
      width: 0px;
      background: transparent;
      display: none;
    }

    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .key-button {
    display: inline-block;
    color: ${(props) => props.theme.table.input.color};
    opacity: 0.7;
    border-radius: 4px;
    padding: 1px 5px;
    font-family: monospace;
    margin-right: 8px;
    border: 1px solid #ccc;
    border-bottom: 1.44px solid ${(props) => props.theme.table.input.border};
  }
`;

export default StyledWrapper;
