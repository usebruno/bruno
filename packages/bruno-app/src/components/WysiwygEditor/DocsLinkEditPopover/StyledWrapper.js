import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.sm};
  color: ${(props) => props.theme.dropdown.color};
  background-color: ${(props) => props.theme.dropdown.bg};
  ${(props) =>
    props.theme.dropdown.shadow && props.theme.dropdown.shadow !== 'none'
      ? `box-shadow: ${props.theme.dropdown.shadow};`
      : 'box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);'}
  border-radius: ${(props) => props.theme.border.radius.base || '6px'};
  border: 1px solid ${(props) => props.theme.dropdown.border || props.theme.border.border1};
  z-index: 9999;
  position: absolute;

  .docs-link-popover-content {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.75rem;
    width: 17rem;

    label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .popover-input {
      width: 100%;
      padding: 5px 8px;
      font-size: 12px;
      background: transparent;
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 6px;
      color: ${(props) => props.theme.text};
      transition: border-color 0.15s ease;
      outline: none;

      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
      }

      &:focus {
        border-color: ${(props) => props.theme.colors.accent};
      }
    }

    .popover-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
  }

  .docs-link-view {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;

    .link-url {
      color: ${(props) => props.theme.colors.text.blue || '#3b82f6'};
      text-decoration: none;
      max-width: 180px;
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
    }

    .action-icons {
      display: flex;
      align-items: center;
      gap: 0.125rem;
      color: ${(props) => props.theme.dropdown.iconColor || props.theme.colors.text.muted};

      .action-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.2rem;
        border-radius: 4px;
        cursor: pointer;
        background: transparent;
        border: none;
        color: inherit;
        outline: none;
        transition: background 0.12s ease, color 0.12s ease;

        &:hover {
          background-color: ${(props) => props.theme.dropdown.hoverBg || 'rgba(0,0,0,0.05)'};
          color: ${(props) => props.theme.text};
        }
      }
    }
  }
`;

export default StyledWrapper;
