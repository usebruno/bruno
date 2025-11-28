import styled from 'styled-components';

const Wrapper = styled.div`
  .dropdown-toggle {
    &:hover {
      color: black;
    }
  }

  .tippy-box {
    min-width: 160px;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.dropdown.color};
    background-color: ${(props) => props.theme.dropdown.bg};
    box-shadow: ${(props) => props.theme.shadow.sm};
    border-radius: ${(props) => props.theme.border.radius.base};
    max-height: 90vh;
    overflow-y: auto;
    max-width: unset !important;
    padding: 0.25rem;

    .tippy-content {
      padding-left: 0;
      padding-right: 0;
      padding-top: 0;
      padding-bottom: 0;

      .label-item {
        display: flex;
        align-items: center;
        padding: 0.375rem 0.625rem 0.25rem 0.625rem;
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        color: ${(props) => props.theme.dropdown.color};
        opacity: 0.6;
        margin-top: 0.25rem;
        
        &:first-child {
          margin-top: 0;
        }
      }

      .dropdown-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.275rem 0.625rem;
        cursor: pointer;
        border-radius: 6px;
        margin: 0.0625rem 0;
        font-size: 0.8125rem;

        &.active {
          color: ${(props) => props.theme.colors.text.yellow} !important;
          .dropdown-icon {
            color: ${(props) => props.theme.colors.text.yellow} !important;
          }
        }

        .dropdown-icon {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${(props) => props.theme.dropdown.iconColor};
          opacity: 0.8;
        }

        &:hover:not(:disabled) {
          background-color: ${(props) => props.theme.dropdown.hoverBg};
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        &.delete-item {
          color: ${(props) => props.theme.colors.text.danger};
          .dropdown-icon {
            color: ${(props) => props.theme.colors.text.danger};
          }
          &:hover {
            background-color: ${({ theme }) => {
              const hex = theme.colors.text.danger.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              return `rgba(${r}, ${g}, ${b}, 0.04)`; // 4% opacity
            }} !important;

            color: ${(props) => props.theme.colors.text.danger} !important;
          }
        }

        &.border-top {
          border-top: solid 1px ${(props) => props.theme.dropdown.separator};
          margin-top: 0.25rem;
          padding-top: 0.375rem;
        }
      }

      .dropdown-separator {
        height: 1px;
        background-color: ${(props) => props.theme.dropdown.separator};
        margin: 0.25rem 0;
      }
    }
  }
`;

export default Wrapper;
