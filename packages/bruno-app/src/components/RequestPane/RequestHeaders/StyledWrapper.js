import styled from 'styled-components';

const Wrapper = styled.div`

  .btn-action {
    font-size: ${(props) => props.theme.font.size.base};
    &:hover span {
      text-decoration: underline;
    }
  }

  .toggle-default-headers {
    color: ${(props) => props.theme.text};

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .bulk-edit-bar {
    position: sticky;
    bottom: 0;
    background: ${(props) => props.theme.bg};
    padding-top: 8px;
    padding-bottom: 4px;
  }

  button.headers-section-toggle {
    width: 100%;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    padding: 0 10px;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.sidebar.bg};
    border: 0;
    border-radius: 0;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
    text-align: left;
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.sidebar.bg};
    }
  }

  .default-header-row {
    .default-header-value {
      font-style: italic;
      color: ${(props) => props.theme.colors.text.muted};
    }

    input[type='checkbox']:disabled {
      opacity: 0.55;
    }
  }

  .header-name-cell {
    width: 100%;
    display: flex;
    align-items: center;
    min-width: 0;

    > :first-child {
      flex: 1 1 auto;
      min-width: 0;
    }
  }

  .header-conflict-icon {
    flex: 0 0 auto;
    margin-left: 8px;
    color: ${(props) => props.theme.status.warning.text};
    cursor: help;
  }

  .default-header-info {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: help;

    &:hover {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  input[type='text'] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;
    background-color: inherit;

    &:focus {
      outline: none !important;
      border: solid 1px transparent;
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    position: relative;
    top: 1px;
  }
`;

export default Wrapper;
