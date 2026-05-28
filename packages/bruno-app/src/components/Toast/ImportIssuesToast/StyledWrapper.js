import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  display: flex;
  background: ${(props) => props.theme.background.surface0};
  color: ${(props) => props.theme.text};
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: ${(props) => props.theme.border.radius.md};
  overflow: hidden;
  max-width: 420px;
  min-width: 380px;
  margin-bottom: 2rem;
  margin-right: 0.75rem;
  box-shadow: 0 4px 12px ${(props) => props.theme.modal?.backdrop?.opacity
    ? `rgba(0, 0, 0, ${props.theme.modal.backdrop.opacity / 100})`
    : 'rgba(0, 0, 0, 0.1)'};
  transition: all 0.3s ease;

  .toast-accent {
    width: 4px;
    flex-shrink: 0;
    border-radius: ${(props) => props.theme.border.radius.md} 0 0 ${(props) => props.theme.border.radius.md};
    background: ${(props) => props.theme.colors.text.danger};
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

  .toast-title {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 4px;
    color: ${(props) => props.theme.text};
  }

  .toast-hint {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.subtext1};
    margin-bottom: 8px;
  }

  .toast-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    cursor: pointer;
    margin-bottom: 10px;

    input[type='checkbox'] {
      accent-color: ${(props) => props.theme.primary.solid};
      cursor: pointer;
      margin: 0;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .toast-checkbox-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toast-checkbox-label {
      font-size: 12px;
      color: ${(props) => props.theme.text};
    }

    .toast-checkbox-desc {
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.subtext2};
      line-height: 1.4;
    }
  }

  .toast-warning {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.warning};
    margin-bottom: 8px;
    line-height: 1.4;

    .toast-warning-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }
  }

  .toast-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .toast-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 4px 10px;
    cursor: pointer;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.background.surface1};
    color: ${(props) => props.theme.text};

    &:hover {
      background: ${(props) => props.theme.background.surface2};
    }
  }
`;

export default StyledWrapper;
