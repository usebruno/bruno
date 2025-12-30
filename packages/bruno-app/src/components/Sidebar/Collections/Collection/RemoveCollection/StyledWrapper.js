import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 500px;
  
  .collection-info-card {
    background-color: ${(props) => props.theme.modal.title.bg};
    border-radius: 4px;
    padding: 12px;
  }
  .collection-name {
    font-weight: 500;
    padding-left: 0 !important;
    color: ${(props) => props.theme.text};
    margin-bottom: 4px;
    cursor: default !important;
    &:hover {
      background: none !important;
    }
  }
  .collection-path {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    word-break: break-all;
  }
  .delete-checkbox-container {
    label {
      user-select: none;
    }
    input[type='checkbox'] {
      cursor: pointer;
      width: 14px;
      height: 14px;
      accent-color: ${(props) => props.theme.colors.accent};
      vertical-align: middle;
      margin: 0;
    }
  }
  .delete-warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    color: ${(props) => props.theme.colors.text.danger};
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.4;

    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    span {
      flex: 1;
      min-width: 0;
      word-break: break-word;
    }
  }
`;

export default StyledWrapper;
