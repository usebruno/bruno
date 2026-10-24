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

  .collections-list-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 250px;
    overflow-y: auto;
    padding-right: 4px;
  }
`;

export default StyledWrapper;
