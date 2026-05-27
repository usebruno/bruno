import styled from 'styled-components';
import { SELECTION_LIST_MAX_WIDTH } from './constants';

const getListHeight = ({ $visibleRows, $rowHeight, $rowGap }) => {
  const rowsHeight = $rowHeight * $visibleRows;
  const gapsHeight = $rowGap * Math.max($visibleRows - 1, 0);

  return `${rowsHeight + gapsHeight}px`;
};

const StyledWrapper = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-width: ${(props) => props.$maxWidth || SELECTION_LIST_MAX_WIDTH};
  min-width: 0;

  .selection-heading {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.25rem;
  }

  .selection-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    min-height: 1.25rem;
    padding: 0 0.25rem;
    border: 1px solid ${(props) => (props.theme.mode === 'dark'
      ? props.theme.workspace.button.bg
      : props.theme.border.border1)};
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => (props.theme.mode === 'dark'
      ? props.theme.overlay.overlay0
      : props.theme.background.surface0)};
    color: ${(props) => props.theme.text};
    font-weight: 500;
  }

  .selection-toolbar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .selection-title {
    margin: 0;
    font-weight: 600;
    color: ${(props) => props.theme.table.thead.color};
  }

  .selection-panel {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    overflow: hidden;
    border: 1px solid ${(props) => (props.theme.mode === 'dark' ? props.theme.border.border1 : props.theme.border.border0)};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.5rem;
  }

  .selection-search {
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    min-width: 0;
    min-height: 1.75rem;
    gap: 0.25rem;
    border: 1px solid ${(props) => (props.theme.mode === 'dark' ? props.theme.border.border1 : props.theme.border.border0)};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.25rem 0.5rem;
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .selection-search input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 400;
    line-height: 1.25rem;
  }

  .selection-search input::placeholder {
    color: ${(props) => props.theme.input.placeholder.color};
    opacity: ${(props) => props.theme.input.placeholder.opacity};
  }

  .selection-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    flex: 0 0 auto;
    cursor: pointer;
    user-select: none;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    line-height: 1.25rem;
  }

  .selection-toggle input[type='checkbox'],
  .selection-item input[type='checkbox'] {
    cursor: pointer;
    margin: 0;
  }

  .selection-list {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: ${(props) => `${props.$rowGap}px`};
    height: ${getListHeight};
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .selection-list li {
    display: block;
    width: 100%;
  }

  .selection-item {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1.5rem minmax(0, 1fr);
    align-items: start;
    width: 100%;
    height: ${(props) => `${props.$rowHeight}px`};
    gap: 0.375rem;
    padding: 0;
    background: transparent;
    border-radius: ${(props) => props.theme.border.radius.base};
    cursor: pointer;
    user-select: none;
  }

  .selection-item input[type='checkbox'] {
    justify-self: center;
    align-self: start;
    margin-top: 0.25rem;
  }

  .selection-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
    gap: 0;
  }

  .selection-item-title {
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
    line-height: 1.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selection-item-description {
    display: -webkit-box;
    min-width: 0;
    width: 100%;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    line-height: 1.25rem;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: ${(props) => props.theme.colors.text.subtext1};
    overflow-wrap: anywhere;
  }

  .selection-empty {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1.5rem minmax(0, 1fr);
    align-items: center;
    width: 100%;
    gap: 0.375rem;
    padding: 0.25rem 0;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
    font-style: italic;
    font-weight: 400;
  }

  .selection-empty-message {
    grid-column: 2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selection-selected-count {
    margin-top: 0.5rem;
  }

`;

export default StyledWrapper;
