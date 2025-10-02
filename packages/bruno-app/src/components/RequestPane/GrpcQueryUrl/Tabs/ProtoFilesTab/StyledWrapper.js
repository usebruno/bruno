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
    color: ${(props) => props.theme.grpc.protoFiles.header.text};
  }

  .settings-button {
    color: ${(props) => props.theme.grpc.protoFiles.header.button.color};
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.2s ease;

    &:hover {
      color: ${(props) => props.theme.grpc.protoFiles.header.button.hoverColor};
    }
  }

  .error-wrapper {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background-color: ${(props) => props.theme.grpc.protoFiles.error.bg};
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: ${(props) => props.theme.grpc.protoFiles.error.text};
  }

  .error-text {
    display: flex;
    align-items: center;
    margin: 0;
  }

  .error-link {
    color: ${(props) => props.theme.grpc.protoFiles.error.link.color};
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    margin-left: 0.25rem;
    font-size: inherit;

    &:hover {
      color: ${(props) => props.theme.grpc.protoFiles.error.link.hoverColor};
    }
  }

  .items-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 15rem;
    overflow-y: auto;
  }

  .item-wrapper {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    border-left: 2px solid transparent;
    background-color: ${(props) => props.theme.grpc.protoFiles.item.bg};
    transition: all 0.2s ease;
    opacity: ${(props) => props.theme.grpc.protoFiles.item.invalid.opacity};

    &.valid {
      opacity: 1;
    }

    &.selected {
      border-left-color: ${(props) => props.theme.grpc.protoFiles.item.selected.border};
      background-color: ${(props) => props.theme.grpc.protoFiles.item.selected.bg};
    }

    &:hover {
      background-color: ${(props) => props.theme.grpc.protoFiles.item.hoverBg};

      &.selected {
        background-color: ${(props) => props.theme.grpc.protoFiles.item.selected.bg};
      }
    }
  }

  .item-content {
    display: flex;
    align-items: center;
  }

  .item-icon {
    margin-right: 0.75rem;
    color: ${(props) => props.theme.grpc.protoFiles.item.icon};
  }

  .item-details {
    display: flex;
    flex-direction: column;
  }

  .item-title {
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    color: ${(props) => props.theme.grpc.protoFiles.item.text};
  }

  .item-path {
    font-size: 0.75rem;
    color: ${(props) => props.theme.grpc.protoFiles.item.secondaryText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 12.5rem;
  }

  .invalid-icon {
    color: ${(props) => props.theme.grpc.protoFiles.item.invalid.text};
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    margin-left: 0.5rem;
  }

  .empty-wrapper {
    padding: 0.5rem 0.75rem;
  }

  .empty-text {
    color: ${(props) => props.theme.grpc.protoFiles.empty.text};
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
    background-color: ${(props) => props.theme.grpc.protoFiles.button.bg};
    color: ${(props) => props.theme.grpc.protoFiles.button.color};
    border: 1px solid ${(props) => props.theme.grpc.protoFiles.button.border};
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.2s ease;

    &:hover {
      border-color: ${(props) => props.theme.grpc.protoFiles.button.hoverBorder};
    }
  }
`;

export default Wrapper;
