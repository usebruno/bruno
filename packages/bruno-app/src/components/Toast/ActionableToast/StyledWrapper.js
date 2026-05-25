import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  display: flex;
  background: ${(props) => props.theme.background.surface0};
  color: ${(props) => props.theme.text};
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: ${(props) => props.theme.border.radius.md};
  overflow: hidden;
  max-width: ${(props) => props.$maxWidth || 480}px;
  min-width: 380px;
  margin-bottom: 2rem;
  margin-right: 0.75rem;
  box-shadow: 0 4px 12px ${(props) => props.theme.modal.backdrop.opacity
    ? `rgba(0, 0, 0, ${props.theme.modal.backdrop.opacity / 100})`
    : 'rgba(0, 0, 0, 0.1)'};
  transition: all 0.3s ease;

  .toast-accent {
    width: 4px;
    flex-shrink: 0;
    border-radius: ${(props) => props.theme.border.radius.md} 0 0 ${(props) => props.theme.border.radius.md};
  }

  .toast-body {
    flex: 1;
    padding: 12px 14px;
    padding-right: 32px;
  }

  .toast-close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.subtext1};
    padding: 2px;
    line-height: 1;
    display: flex;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
