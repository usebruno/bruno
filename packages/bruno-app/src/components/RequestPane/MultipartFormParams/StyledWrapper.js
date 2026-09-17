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
    flex: 0 0 auto;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .clear-file-btn:hover {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .value-cell {
    width: 100%;

    .flex-1 {
      min-width: 0;
    }
  }
`;

export default Wrapper;
