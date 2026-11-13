import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  height: 3rem;
  padding: 0.375rem 0.5rem;
  border-radius: ${(props) => props.theme.border.radius.md};
  outline: none;
  cursor: pointer;

  &:hover,
  &:focus-visible,
  &:has(:focus-visible) {
    background: ${(props) => props.theme.background.crust};
  }

  &:focus-visible {
    outline: 0.0625rem solid ${(props) => props.theme.input.focusBorder};
    outline-offset: -0.0625rem;
  }

  .collection-list-row-lead {
    position: relative;
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
  }

  .collection-list-row-icon,
  .collection-list-row-checkbox {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .collection-list-row-icon {
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.background.surface0};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-list-row-checkbox {
    opacity: 0;
    pointer-events: none;
  }

  &:not(.is-open):hover,
  &:not(.is-open):focus-visible,
  &:not(.is-open):has(:focus-visible),
  &.is-selecting:not(.is-open) {
    .collection-list-row-icon {
      opacity: 0;
    }

    .collection-list-row-checkbox {
      opacity: 1;
    }
  }

  .collection-list-row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .collection-list-row-name,
  .collection-list-row-path {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collection-list-row-name {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .collection-list-row-path {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-list-row-end {
    position: relative;
    flex: none;
    min-width: 4.5rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .collection-list-row-meta {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.subtext0};
    white-space: nowrap;
  }

  .collection-list-row-action {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    opacity: 0;
    pointer-events: none;

    button {
      height: 1.625rem;
      padding: 0 0.625rem;
    }
  }

  &:hover,
  &:focus-visible,
  &:has(:focus-visible) {
    .collection-list-row-action {
      opacity: 1;
      pointer-events: auto;
    }

    .collection-list-row-meta {
      visibility: hidden;
    }
  }

  &.is-open {
    cursor: default;

    .collection-list-row-icon,
    .collection-list-row-name,
    .collection-list-row-path {
      opacity: 0.55;
    }
  }
`;

export default StyledWrapper;
