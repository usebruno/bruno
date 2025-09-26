import styled from 'styled-components';

const Wrapper = styled.div`
  .current-group {
    background-color: ${props => props.theme.sidebar.badge.bg};
    border-radius: 4px;
    padding: 0.4rem;
    cursor: pointer;
    border: 1px solid ${props => props.theme.sidebar.badge.border || 'transparent'};
  }

  .current-group:hover {
    background-color: ${props => props.theme.sidebar.badge.hoverBg || props.theme.sidebar.badge.bg};
  }

  /* Fix dropdown positioning */
  [data-tippy-root] {
    left: 0 !important;
  }
`;

export default Wrapper;
