import styled from 'styled-components';
import iconInputStyles from '../IconInputStyles';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .collection-list-search-row {
    flex: none;
    display: flex;
    align-items: center;
    padding: 0.125rem 1.25rem 0.625rem;

    .collection-list-choose-folder button {
      height: 1.875rem;
    }
  }

  .collection-list-search {
    ${iconInputStyles}
    flex: 1;
    min-width: 0;

    > svg {
      top: 0.5rem;
    }

    input {
      height: 1.875rem;
      padding-left: 1.75rem;
      font-size: ${(props) => props.theme.font.size.sm};
    }
  }

  .collection-list-search-clear {
    position: absolute;
    top: 0.25rem;
    right: 0.75rem;

    &:hover {
      background: none;
    }
  }

  .collection-list-select-all {
    flex: none;
    margin-left: 0.75rem;
  }

  .collection-list-search-or {
    flex: none;
    padding: 0 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-list-rows {
    flex: 1;
    min-height: 0;
    margin: 0 0.75rem 0.375rem;
    overflow: hidden;
  }

  .collection-list-empty {
    margin: 0;
    padding: 2.75rem 1.5rem;
    text-align: center;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-list-item {
    position: relative;
    padding-bottom: 0.0625rem;

    &:not(.is-last)::after {
      content: '';
      position: absolute;
      right: 0.5rem;
      bottom: 0;
      left: 0.5rem;
      height: 0.0625rem;
      background: ${(props) => props.theme.border.border0};
      pointer-events: none;
    }

    &:hover::after,
    &:has(+ .collection-list-item:hover)::after {
      visibility: hidden;
    }
  }

  .collection-list-open-line {
    margin: 0;
    padding: 0.625rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-list-open-toggle {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.125rem;
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .collection-list-footer {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-top: 0.0625rem solid ${(props) => props.theme.border.border1};
  }
`;

export default StyledWrapper;
