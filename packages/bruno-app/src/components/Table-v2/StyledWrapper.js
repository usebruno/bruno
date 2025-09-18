import styled from 'styled-components';

const StyledWrapper = styled.div`
  table {
    width: 100%;
    display: grid;
    overflow-y: hidden;
    overflow-x: auto;
    padding: 0 1.5px;
    border-radius: 8px;

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
    border: none;
  }

  table th {
    position: relative;
    border: none;
    border-bottom: 1px solid ${(props) => props.theme.collection.environment.settings.gridBorder}77;
    background: ${(props) => props.theme.examples.table.thead.bg};
    color: ${(props) => props.theme.examples.table.thead.color};
    font-weight: 400;

    tr td {
      border: none;
      color: ${(props) => props.theme.examples.table.thead.color};
      background: ${(props) => props.theme.examples.table.thead.bg};
    }
  }

  table tr td {
    padding: 0.5rem;
    text-align: left;
    border: 1px solid ${(props) => props.theme.collection.environment.settings.gridBorder}77;
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
    border-top: 1px solid ${(props) => props.theme.collection.environment.settings.gridBorder}77;
    font-weight: 400;

    &:nth-child(1) {
      border-left: 1px solid ${(props) => props.theme.collection.environment.settings.gridBorder}77;
    }

    &:last-child {
      border-right: 1px solid ${(props) => props.theme.collection.environment.settings.gridBorder}77;
    }
  }
`;

export default StyledWrapper;
