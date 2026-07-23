import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: absolute;
  z-index: 9999;
  font-size: ${(props) => props.theme.font.size.sm};
  color: ${(props) => props.theme.dropdown.color};
  background-color: ${(props) => props.theme.dropdown.bg};
  border: 1px solid ${(props) => props.theme.dropdown.border || props.theme.border.border1};
  border-radius: ${(props) => props.theme.border.radius.base || '6px'};
  ${(props) =>
    props.theme.dropdown.shadow && props.theme.dropdown.shadow !== 'none'
      ? `box-shadow: ${props.theme.dropdown.shadow};`
      : 'box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);'}

  .hover-link-view {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.35rem 0.55rem;

    .link-url {
      color: ${(props) => props.theme.colors.text.blue || '#3b82f6'};
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
        transition: background 0.1s ease, color 0.1s ease;

        &:hover {
          background-color: ${(props) => props.theme.dropdown.hoverBg || 'rgba(0,0,0,0.05)'};
          color: ${(props) => props.theme.text};
        }
      }
    }
  }
`;

export default StyledWrapper;
