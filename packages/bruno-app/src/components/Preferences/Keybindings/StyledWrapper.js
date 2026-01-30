import styled from 'styled-components';

const StyledWrapper = styled.div`
  table {
    width: 80%;
    border-collapse: collapse;

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
      font-size: ${(props) => props.theme.font.size.sm};
    }

    thead th {
      font-weight: 500;
      padding: 10px;
      text-align: left;
      border: 1px solid ${(props) => props.theme.table.border};
    }
  }

  .table-container {
    overflow-y: auto;
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
