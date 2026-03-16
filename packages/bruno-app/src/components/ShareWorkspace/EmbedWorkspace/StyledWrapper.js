import styled from 'styled-components';

const StyledWrapper = styled.div`
  .opencollection-link {
    color: ${(props) => props.theme.textLink};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  .embed-description {
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.text.body};
    margin-bottom: 0.5rem;
  }

  .embed-section {
    margin-bottom: 0;
  }

  .embed-remote-url-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.secondary};
    border: 1px solid ${(props) => props.theme.border.border0};

    .embed-remote-icon {
      color: ${(props) => props.theme.colors.text.warning};
      flex-shrink: 0;
    }

    .embed-remote-url {
      font-size: 0.875rem;
      color: ${(props) => props.theme.colors.text.body};
      word-break: break-all;
      flex: 1;
    }
  }

  .embed-tabs-row {
    margin-bottom: 1rem;
  }

  .embed-code-wrap {
    position: relative;

    .embed-code-container,
    .code-container {
      border-radius: ${(props) => props.theme.border.radius.base};
      border: 1px solid ${(props) => props.theme.border.border0};
      background-color: ${(props) => props.theme.background.secondary};
      overflow: auto;
      height: 150px;
      width: 100%;
      display: flex;
    }

    .embed-copy-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.375rem;
      border-radius: ${(props) => props.theme.border.radius.base};
      color: ${(props) => props.theme.colors.text.subtext0};
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s, color 0.15s;

      &:hover {
        background-color: ${(props) => props.theme.background.base};
        color: ${(props) => props.theme.colors.text.body};
      }
    }
  }

  .embed-warning-box {
    padding: 1rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.status.warning.background};
    color: ${(props) => props.theme.status.warning.text};
    border: 1px solid ${(props) => props.theme.status.warning.border};
  }
`;

export default StyledWrapper;
