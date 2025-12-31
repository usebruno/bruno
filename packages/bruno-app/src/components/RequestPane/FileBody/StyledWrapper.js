import styled from 'styled-components';

const Wrapper = styled.div`
  .upload-btn,
  .clear-file-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 4px;
    transition: color 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.colors.text.link};
    }
  }

  .clear-file-btn:hover {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .file-value-cell {
    padding: 4px 0;

    .file-icon {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .file-name {
      font-size: 12px;
      color: ${(props) => props.theme.colors.text.subtext2};
    }
  }

  .value-cell {
    .flex-1 {
      min-width: 0;
    }
  }

  .placeholder-text {
    color: ${(props) => props.theme.colors.text.muted};
    font-style: italic;
  }
`;

export default Wrapper;
