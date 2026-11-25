import styled from 'styled-components';

const StyledWrapper = styled.div`
  .git-tabs {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .git-tabs .tab {
    padding: 0.5rem 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext0};
    border-bottom: 2px solid transparent;
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.tabs.active.color};
    }

    &.active {
      color: ${(props) => props.theme.tabs.active.color};
      border-bottom-color: ${(props) => props.theme.tabs.active.border};
    }

    &[aria-disabled='true'],
    &[aria-disabled='true']:hover {
      color: ${(props) => props.theme.colors.text.subtext0};
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

export default StyledWrapper;
