import styled from 'styled-components';

const Wrapper = styled.div`
  .content-wrapper {
    padding: 0.5rem 0.75rem;
  }

  .header-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .header-text {
    font-size: 0.75rem;
    color: ${props => props.theme.grpc.importPaths.header.text};
  }

  .settings-button {
    color: ${props => props.theme.grpc.importPaths.header.button.color};
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.2s ease;

    &:hover {
      color: ${props => props.theme.grpc.importPaths.header.button.hoverColor};
    }
  }

  .error-wrapper {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background-color: ${props => props.theme.grpc.importPaths.error.bg};
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: ${props => props.theme.grpc.importPaths.error.text};
  }

  .error-text {
    display: flex;
    align-items: center;
    margin: 0;
  }

  .error-link {
    color: ${props => props.theme.grpc.importPaths.error.link.color};
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    margin-left: 0.25rem;
    font-size: inherit;

    &:hover {
      color: ${props => props.theme.grpc.importPaths.error.link.hoverColor};
    }
  }

  .items-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 15rem;
    overflow: auto;
    max-width: 30rem;
  }

  .item-wrapper {
    padding: 0.5rem 0.75rem;
    opacity: ${props => props.theme.grpc.importPaths.item.invalid.opacity};

    &.valid {
      opacity: 1;
    }
  }

  .item-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .item-left {
    display: flex;
    align-items: center;
  }

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    margin-right: 0.75rem;
  }

  .checkbox {
    margin-right: 0.5rem;
    cursor: pointer;
    color: ${props => props.theme.grpc.importPaths.item.checkbox.color};
  }

  .item-text {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .invalid-icon {
    color: ${props => props.theme.grpc.importPaths.item.invalid.text};
    font-size: 0.75rem;
    display: flex;
    align-items: center;
  }

  .empty-wrapper {
    padding: 0.5rem 0.75rem;
  }

  .empty-text {
    color: ${props => props.theme.grpc.importPaths.empty.text};
    font-size: 0.875rem;
    font-style: italic;
    text-align: center;
    padding: 0.5rem 0;
  }

  .button-wrapper {
    padding: 0.5rem 0.75rem;
  }

  .browse-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.theme.grpc.importPaths.button.bg};
    color: ${props => props.theme.grpc.importPaths.button.color};
    border: 1px solid ${props => props.theme.grpc.importPaths.button.border};
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.2s ease;

    &:hover {
      border-color: ${props => props.theme.grpc.importPaths.button.hoverBorder};
    }
  }
`;

export default Wrapper;
