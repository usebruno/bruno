import styled from 'styled-components';

const StyledWrapper = styled.div`
  table {
    width: 100%;
    display: grid;
    overflow-y: hidden;
    overflow-x: auto;
    padding: 0 1.5px;

    // for icon hover
    position: inherit;

    grid-template-columns: ${({ columns }) =>
      columns?.[0]?.width
        ? columns.map((col) => `${col?.width}`).join(' ')
        : columns.map((col) => `${100 / columns.length}%`).join(' ')};
  }

  table thead,
  table tbody,
  table tr {
    display: contents;
  }

  table th {
    position: relative;
    font-weight: 400;
    border-bottom: 1px solid ${(props) => props.theme.table.border};
  }

  table tr td {
    padding: 0.5rem;
    text-align: left;
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-right: 1px solid ${(props) => props.theme.table.border};
  }

  tr {
    transition: transform 0.2s ease-in-out;
  }

  tr.dragging {
    opacity: 0.5;
  }

  tr.hovered {
    transform: translateY(10px); /* Adjust the value as needed for the animation effect */
  }

  table tr th {
    padding: 0.5rem;
    text-align: left;
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-right: 1px solid ${(props) => props.theme.table.border};

    &:nth-child(1) {
      border-left: 1px solid ${(props) => props.theme.table.border};
    }
  }
`;

export default StyledWrapper;
