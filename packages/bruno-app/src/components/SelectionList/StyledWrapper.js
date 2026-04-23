import styled from 'styled-components';
import { transparentize } from 'polished';

const getListHeight = ({ $visibleRows, $rowHeight, $rowGap, $listPadding }) => {
  const rowsHeight = $rowHeight * $visibleRows;
  const gapsHeight = $rowGap * Math.max($visibleRows - 1, 0);
  const paddingHeight = $listPadding * 2;
  const bordersHeight = 2;

  return `${rowsHeight + gapsHeight + paddingHeight + bordersHeight}px`;
};

const StyledWrapper = styled.div`
  .selection-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .selection-title {
    margin: 0;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
  }

  .selection-toggle {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 400;
  }

  .selection-toggle input[type='checkbox'] {
    cursor: pointer;
    margin-right: 0.5rem;
  }

  .selection-list {
    max-height: ${getListHeight};
    overflow-y: auto;
    border: 1px solid ${(props) => transparentize(0.4, props.theme.border.border2)};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: ${(props) => `${props.$listPadding}px 0`};
    margin: 0;
    list-style: none;
  }

  .selection-item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    min-height: ${(props) => `${props.$rowHeight}px`};
    padding: 0.375rem 1rem;
    cursor: pointer;
    user-select: none;
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 400;
  }

  .selection-list li + li .selection-item {
    margin-top: ${(props) => `${props.$rowGap}px`};
  }

  .selection-item input[type='checkbox'] {
    accent-color: ${(props) => props.theme.workspace.accent};
    cursor: pointer;
    margin-right: 0.75rem;
  }

  .selection-path {
    line-height: 1.2;
    word-break: break-word;
  }

  .selection-empty {
    padding: 0.5rem;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
    font-style: italic;
  }
`;

export default StyledWrapper;
