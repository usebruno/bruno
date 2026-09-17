import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: fixed;
  z-index: 9999;
  font-size: ${(props) => props.theme.font.size.sm};
  color: ${(props) => props.theme.dropdown.color};
  background-color: ${(props) => props.theme.dropdown.bg};
  border: 1px solid ${(props) => props.theme.dropdown.border};
  border-radius: ${(props) => props.theme.border.radius.base};
  box-shadow: ${(props) => props.theme.dropdown.shadow || 'none'};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
  }

  &[data-popper-placement^='top']::before {
    bottom: -4px;
  }

  &[data-popper-placement^='bottom']::before {
    top: -4px;
  }

  &[data-popper-reference-hidden] {
    visibility: hidden;
    pointer-events: none;

    &, * {
      visibility: hidden !important;
      transition: none !important;
    }
  }

  .hover-link-view {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.35rem 0.55rem;

    .link-url {
      color: ${(props) => props.theme.textLink};
      text-decoration: none;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;

      &:hover {
        text-decoration: underline;
      }
    }

    .view-separator {
      width: 1px;
      height: 14px;
      background: ${(props) => props.theme.border.border1};
      flex-shrink: 0;
      margin-inline: 0.125rem;
    }

    .action-icons {
      display: flex;
      align-items: center;
      gap: 0.1rem;
      color: ${(props) => props.theme.dropdown.iconColor};

      .action-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.3rem;
        border-radius: ${(props) => props.theme.border.radius.sm};
        cursor: pointer;
        background: transparent;
        border: none;
        color: inherit;
        outline: none;
        transition: background 0.1s ease, color 0.1s ease;

        &:hover {
          background-color: ${(props) => props.theme.dropdown.hoverBg};
          color: ${(props) => props.theme.text};
        }
      }
    }
  }
`;

export default StyledWrapper;
