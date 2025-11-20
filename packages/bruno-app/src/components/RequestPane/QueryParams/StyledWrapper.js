import styled from 'styled-components';

const Wrapper = styled.div`
  /* Polaris-inspired section title */
  div.title {
    font-size: 0.6875rem; /* 11px */
    font-weight: 600;
    color: ${(props) => props.theme.table?.thead?.color || '#616161'};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }

  /* Polaris-inspired path params table */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    background: ${(props) => props.theme.bg || '#fff'};
    border: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
    border-radius: 8px;
    overflow: hidden;

    thead {
      background: ${(props) => props.theme.table?.thead?.bg || props.theme.bg || '#fff'};
      
      tr {
        &:first-child td:first-child {
          border-top-left-radius: 7px;
        }
        &:first-child td:last-child {
          border-top-right-radius: 7px;
        }
      }
      
      td {
        padding: 6px 8px;
        font-size: 0.6875rem; /* 11px */
        font-weight: 600;
        color: ${(props) => props.theme.table?.thead?.color || '#616161'};
        text-transform: uppercase;
        letter-spacing: 0.04em;
        user-select: none;
        border: none;
        border-bottom: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
      }
    }

    tbody {
      tr {
        transition: background-color 150ms ease;
        
        &:last-child td:first-child {
          border-bottom-left-radius: 7px;
        }
        &:last-child td:last-child {
          border-bottom-right-radius: 7px;
        }
        
        &:hover {
          background: ${(props) => props.theme.table?.row?.hoverBg || '#F6F6F7'};
        }
      }
      
      td {
        padding: 6px 8px;
        font-size: 0.75rem; /* 12px */
        color: ${(props) => props.theme.text || '#202223'};
        border: none;
        border-top: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
        
        &:first-child {
          padding-left: 8px;
        }
      }
    }
  }

  /* Polaris-inspired action buttons */
  .btn-action {
    font-size: 0.75rem; /* 12px */
    font-weight: 500;
    color: ${(props) => props.theme.textLink || '#1663bb'};
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 6px;
    transition: color 150ms ease;
    
    &:hover {
      color: ${(props) => props.theme.brand || '#546de5'};
      
      span {
        text-decoration: underline;
      }
    }
    
    &:active {
      color: ${(props) => props.theme.brand || '#546de5'};
    }
  }

  /* Polaris-inspired form inputs */
  input[type='text'] {
    width: 100%;
    border: none;
    outline: none;
    background-color: transparent;
    font-size: 0.75rem; /* 12px */
    color: ${(props) => props.theme.text || '#202223'};
    padding: 0;
    
    &:focus {
      outline: none;
      border: none;
    }
    
    &::placeholder {
      color: ${(props) => props.theme.colors?.text?.muted || '#8C9196'};
    }
  }

  /* Polaris-inspired checkbox */
  input[type='checkbox'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1.5px solid ${(props) => props.theme.table?.checkbox?.border || '#8C9196'};
    background: ${(props) => props.theme.bg || '#fff'};
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    position: relative;
    transition: all 150ms ease;
    flex-shrink: 0;
    vertical-align: middle;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      border-color: ${(props) => props.theme.table?.checkbox?.hoverBorder || '#0052CC'};
    }
    
    &:checked {
      background: ${(props) => props.theme.table?.checkbox?.checkedBg || '#0052CC'};
      border-color: ${(props) => props.theme.table?.checkbox?.checkedBorder || '#0052CC'};
      
      &::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 4px;
        height: 8px;
        border: solid ${(props) => props.theme.table?.checkbox?.checkmarkColor || 'white'};
        border-width: 0 2px 2px 0;
        transform: translate(-50%, -55%) rotate(45deg);
      }
    }
    
    &:focus {
      outline: 2px solid ${(props) => props.theme.table?.checkbox?.focusOutline || '#0052CC33'};
      outline-offset: ${(props) => props.theme.table?.checkbox?.focusOutlineOffset || '2px'};
    }
    
    &:focus:not(:focus-visible) {
      outline: none;
    }
  }
`;

export default Wrapper;
