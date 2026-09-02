import styled from 'styled-components';

const StyledWrapper = styled.div`
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
