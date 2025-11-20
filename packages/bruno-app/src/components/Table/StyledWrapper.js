import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Polaris-inspired table design */
  border-radius: 8px;
  overflow: hidden;
  
  table {
    width: 100%;
    display: grid;
    overflow-y: hidden;
    overflow-x: auto;
    border-collapse: collapse;
    background: ${(props) => props.theme.bg || '#fff'};
    
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

  /* Polaris table heading styling */
  table th {
    position: relative;
    padding: 6px 8px;
    text-align: left;
    font-size: 0.6875rem; /* 11px */
    font-weight: 600;
    color: ${(props) => props.theme.table?.thead?.color || '#616161'};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: ${(props) => props.theme.table?.thead?.bg || props.theme.bg || '#fff'};
    border-bottom: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
    
    &:first-child {
      padding-left: 8px;
    }
    
    &:last-child {
      padding-right: 8px;
    }
  }

  /* Polaris table row styling */
  table tr {
    transition: background-color 150ms ease;
  }
  
  table tbody tr {
    background: ${(props) => props.theme.bg || '#fff'};
    
    &:hover {
      background: ${(props) => props.theme.table?.row?.hoverBg || '#F6F6F7'};
    }
  }

  /* Drag and drop states */
  tr.dragging {
    opacity: 0.5;
    background: ${(props) => props.theme.table?.row?.hoverBg || '#F6F6F7'};
  }

  tr.hovered {
    background: ${(props) => props.theme.table?.row?.hoverBg || '#F6F6F7'};
  }

  /* Polaris table cell styling */
  table tbody tr td {
    padding: 6px 8px;
    text-align: left;
    font-size: 0.75rem; /* 12px */
    color: ${(props) => props.theme.text || '#202223'};
    white-space: nowrap;
    border-top: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
    
    &:first-child {
      padding-left: 8px;
    }
    
    &:last-child {
      padding-right: 8px;
    }
  }
  
  table tbody tr:first-child td {
    border-top: none;
  }

  /* Column resizer - Polaris blue accent */
  .resizer {
    opacity: 0;
    transition: opacity 150ms ease;
    
    &:hover {
      opacity: 1;
      background: ${(props) => props.theme.brand || '#546de5'} !important;
    }
    
    &:active {
      opacity: 1;
      background: ${(props) => props.theme.brand || '#546de5'} !important;
    }
  }
  
  table th:hover .resizer {
    opacity: 0.3;
  }
`;

export default StyledWrapper;
