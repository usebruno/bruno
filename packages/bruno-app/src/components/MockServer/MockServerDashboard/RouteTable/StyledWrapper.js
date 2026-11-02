import styled from 'styled-components';

const Wrapper = styled.div`
  table tbody tr:hover .copy-path-btn {
    opacity: 1;
  }

  .path-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .route-path {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.sm};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .copy-path-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 2px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;

    &:focus-visible {
      opacity: 1;
    }

    &:hover {
      color: inherit;
    }
  }

  .source-file {
    font-size: ${(props) => props.theme.font.size.xs};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .empty-state {
    padding: 40px 0;
    text-align: center;
  }
`;

export default Wrapper;
