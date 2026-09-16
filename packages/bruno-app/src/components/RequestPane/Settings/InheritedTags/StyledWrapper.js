import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tag-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 7px;
    background-color: ${(props) => props.theme.sidebar.bg};
    border: 1px dashed ${(props) => props.theme.requestTabs.bottomBorder};
    border-radius: 3px;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.textSecondary || props.theme.text};
    max-width: 200px;
  }

  .tag-icon {
    opacity: 0.7;
    flex-shrink: 0;
  }

  .tag-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-text {
    color: ${(props) => props.theme.textSecondary || props.theme.text};
    opacity: 0.7;
  }
`;

export default StyledWrapper;
