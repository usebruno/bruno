import styled from 'styled-components';

const StyledWrapper = styled.div`
  border-bottom: 1px solid ${(props) => props.theme.border.border0};
  transition: opacity 0.15s ease;

  &.disabled {
    opacity: 0.45;
  }

  .accordion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    cursor: pointer;
    user-select: none;

    .accordion-left {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex: 1;
      min-width: 0;
      color: ${(props) => props.theme.text};

      .message-label {
        font-size: ${(props) => props.theme.font.size.sm};
        cursor: default;
      }

      .name-input {
        font-size: ${(props) => props.theme.font.size.sm};
        color: inherit;
        background: ${(props) => props.theme.background.surface1};
        border: none;
        border-radius: 0.375rem;
        padding: 0.25rem 0.5rem;
        outline: none;
        flex: 1;
      }
    }

    .accordion-actions {
      display: flex;
      align-items: center;
      gap: 0.125rem;

      .hover-actions {
        display: flex;
        align-items: center;
        gap: 0.125rem;
        visibility: hidden;
        opacity: 0;
        transition: opacity 0.15s ease;

        .hover-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.25rem;
          color: ${(props) => props.theme.text};
          transition: all 0.15s ease;

          &:hover {
            background-color: ${(props) => props.theme.dropdown.hoverBg};
          }

          &.delete:hover {
            color: ${(props) => props.theme.colors.text.danger};
          }
        }
      }
    }

    &:hover .hover-actions {
      visibility: visible;
      opacity: 1;
    }
  }

  &:not(.disabled) .accordion-header .message-label {
    color: ${(props) => props.theme.primary.text};
  }
`;

export default StyledWrapper;
