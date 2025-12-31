import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;

  .table-container {
    overflow-y: auto;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: solid 1px ${(props) => props.theme.border.border0};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: normal !important;
  }

  thead {
    color: ${(props) => props.theme.table.thead.color} !important;
    background: ${(props) => props.theme.sidebar.bg};
    user-select: none;

    border: none !important;

    td {
      padding: 5px 10px !important;
      border-top: none !important;
      border-left: none !important;
      border-bottom: solid 1px ${(props) => props.theme.border.border0};
      border-right: solid 1px ${(props) => props.theme.border.border0};
      vertical-align: middle;

      &:last-child {
        border-right: none;
      }
    }
  }

  &.has-checkbox thead td:nth-child(1) {
    width: 25px !important;
    border-right: none;
  }

  tbody {
    tr {
      transition: background 0.1s ease;

      &:last-child td {
        border-bottom: none;
      }

      td {
        padding: 1px 10px !important;
        border-top: none !important;
        border-left: none !important;
        border-bottom: solid 1px ${(props) => props.theme.border.border0};
        border-right: solid 1px ${(props) => props.theme.border.border0};
        vertical-align: middle;

        &:last-child {
          border-right: none;
        }
      }
    }
  }

  &.has-checkbox tbody td:nth-child(1) {
    width: 25px;
    border-right: none;
    text-align: center;
    vertical-align: middle;
    line-height: 1;

    input[type='checkbox'] {
      vertical-align: baseline;
      display: inline-block;
    }
  }

  .tooltip-mod {
    font-size: 11px !important;
    max-width: 200px !important;
  }

  input[type='text'] {
    width: 100%;
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

    &.checkbox-readonly,
    &:disabled {
      cursor: default;
      opacity: 0.5;
    }
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

    &:hover {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .drag-handle {
    .icon-grip,
    .icon-minus {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  select {
    background-color: transparent;
    color: ${(props) => props.theme.text};
    border: none;
    outline: none;
    padding: 2px 8px;
    font-size: 12px;
    cursor: pointer;

    option {
      background-color: ${(props) => props.theme.bg};
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
