import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  display: flex;

  &:hover {
    background: ${(props) => props.theme.background.surface0};
  }

  .collection-row-checkbox,
  .checkbox-root,
  .checkbox-label {
    flex: 1;
    min-width: 0;
  }

  .checkbox-root {
    gap: 0.75rem;
    padding: 0.5rem 0.875rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .collection-row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .collection-row-name,
  .collection-row-path {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collection-row-name {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
  }

  .collection-row-path {
    font-family: var(--font-family-mono);
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-row-meta {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 40%;
    overflow: hidden;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .collection-row-action {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    transform: translateY(-50%);
    opacity: 0;
    pointer-events: none;
  }

  &:hover .collection-row-action,
  .collection-row-action:focus-within {
    opacity: 1;
    pointer-events: auto;
  }

  &:hover .collection-row-meta,
  &:has(.collection-row-action:focus-within) .collection-row-meta {
    visibility: hidden;
  }

  &.is-open {
    .checkbox-root {
      cursor: default;
      opacity: 1;
    }

    .checkbox-box-wrapper {
      opacity: 0.5;
    }

    .collection-row-name,
    .collection-row-path {
      opacity: 0.55;
    }

    &:hover {
      background: transparent;
    }

    &:hover .collection-row-meta {
      visibility: visible;
    }
  }
`;

export default StyledWrapper;
