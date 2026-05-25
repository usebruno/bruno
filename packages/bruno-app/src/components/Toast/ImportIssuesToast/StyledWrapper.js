import styled from 'styled-components';

const StyledWrapper = styled.div`
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
