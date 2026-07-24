import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Bordered container with internal dividers */
  .listgroup {
    display: flex;
    flex-direction: column;
    max-width: ${(props) => props.$maxWidth};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    overflow: hidden;
  }

  .listgroup-item {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.6rem 0.75rem;
    transition: background-color ease-in-out 0.12s;

    &:not(:last-child) {
      border-bottom: 1px solid ${(props) => props.theme.border.border1};
    }

    &:hover,
    &:focus-within {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }

    /* keep row actions hidden until the row is engaged */
    .action-icon {
      opacity: 0;
      transition: opacity ease-in-out 0.12s;
    }

    &:hover .action-icon,
    &:focus-within .action-icon,
    .action-icon.stay-visible {
      opacity: 1;
    }
  }

  .listgroup-item-leading {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .listgroup-item-body {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    flex: 1;
  }

  .listgroup-item-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* Empty state — same frame as the list so the surface stays put */
  .listgroup-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.3rem;
    max-width: ${(props) => props.$maxWidth};
    padding: 2rem 1rem;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    color: ${(props) => props.theme.colors.text.muted};

    svg {
      opacity: 0.5;
      margin-bottom: 0.2rem;
    }

    .listgroup-empty-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: ${(props) => props.theme.text};
    }

    .listgroup-empty-text {
      font-size: 0.75rem;
      max-width: 340px;
    }
  }
`;

export default StyledWrapper;
