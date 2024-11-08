import styled from 'styled-components';

const StyledWrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;

    thead,
    td {
      border: 2px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 1rem;
      user-select: none;
    }

    td {
      padding: 4px 8px;
    }

    thead th {
      font-weight: 600;
      padding: 10px;
      text-align: left;
    }
  }

  .table-container {
    max-height: 400px;
    overflow-y: scroll;
  }

  .key-button {
    display: inline-block;
    color: ${(props) => props.theme.table.input.color};
    border-radius: 4px;
    padding: 1px 5px;
    font-family: monospace;
    margin-right: 8px;
    border: 1px solid #ccc;
  }
`;

export default StyledWrapper;
