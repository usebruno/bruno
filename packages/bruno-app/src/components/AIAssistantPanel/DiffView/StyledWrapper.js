import styled from 'styled-components';

const StyledWrapper = styled.div`
font-family: monospace;
font-size: 11px;
line-height: 1.4;
overflow-x: auto;
background: ${(props) => props.theme.codemirror.bg};
border-radius: ${(props) => props.theme.border.radius.sm};
max-height: 250px;
overflow-y: auto;
border: 1px solid ${(props) => props.theme.codemirror.border};

&::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

&::-webkit-scrollbar-thumb {
  background: ${(props) => props.theme.scrollbar.color};
  border-radius: 2px;
}

.diff-line {
  display: flex;
  padding: 0 6px;
  white-space: pre-wrap;
  word-break: break-all;

  &.added {
    background-color: rgba(46, 160, 67, 0.12);
    color: #3fb950;
    .line-prefix { color: #3fb950; }
  }

  &.removed {
    background-color: rgba(248, 81, 73, 0.12);
    color: #f85149;
    .line-prefix { color: #f85149; }
  }

  &.unchanged {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .line-number {
    min-width: 28px;
    padding-right: 6px;
    text-align: right;
    user-select: none;
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.5;
    font-size: 10px;
  }

  .line-prefix {
    min-width: 12px;
    user-select: none;
  }

  .line-content { flex: 1; }
}

.diff-stats {
  padding: 4px 8px;
  border-bottom: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.1);

  .stats-left {
    display: flex;
    gap: 8px;
    flex: 1;
  }

  .additions { color: #3fb950; }
  .deletions { color: #f85149; }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    border-radius: 2px;
    transition: all 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.colors.text.primary};
    }

    &.copied {
      color: ${(props) => props.theme.colors.text.green};
    }
  }
}
`;

export default StyledWrapper;
