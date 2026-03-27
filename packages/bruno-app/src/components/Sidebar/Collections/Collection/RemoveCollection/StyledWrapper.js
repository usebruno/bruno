import styled from 'styled-components';

const StyledWrapper = styled.div`
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &:hover {
      background: none !important;
    }
  }
  .collection-path {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    word-break: break-all;
  }
  .warning-icon {
    color: ${(props) => props.theme.status.warning.text};
  }

  .warning-text {
    color: ${(props) => props.theme.status.warning.text};
  }
  .draft-list-item {
    color: ${(props) => props.theme.colors.text.muted};
  }
  .transient-hint {
    color: ${(props) => props.theme.colors.text.warning};
  }
  .transient-item {
    background-color: ${(props) => props.theme.background.surface0};
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: 4px;
  }
  .transient-item-name {
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
