import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;

  .table-container {
    overflow-y: auto;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: ${(props) => props.theme.workspace.environments.indentBorder};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }

  thead {
    color: ${(props) => props.theme.colors.text.muted} !important;
    background: ${(props) => props.theme.sidebar.bg};
    font-size: ${(props) => props.theme.font.size.xs} !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    user-select: none;

    border: none !important;

    td {
      padding: 8px 10px;
      border-top: none !important;
      border-left: none !important;
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

      &:hover {
        background: ${(props) => props.theme.sidebar.bg};
      }

      &:last-child td {
        border-bottom: none;
      }

      td {
        padding: 4px 12px;
        border-top: none !important;
        border-left: none !important;
        border-bottom: ${(props) => props.theme.workspace.environments.indentBorder};
        border-right: ${(props) => props.theme.workspace.environments.indentBorder};

        &:last-child {
          border-right: none;
        }
      }
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
    padding: 5px 8px;
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
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;

    option {
      background-color: ${(props) => props.theme.bg};
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
