import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .changelog-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid ${(props) => props.theme.requestTabs?.border || props.theme.sidebar?.border || 'transparent'};
    color: ${(props) => props.theme.text};

    .header-version {
      font-size: ${(props) => props.theme.font?.size?.sm || '0.85em'};
      color: ${(props) => props.theme.colors?.text?.muted || props.theme.text};
      opacity: 0.7;
    }
  }

  .changelog-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem 2rem 1.5rem;
  }
`;

export default StyledWrapper;
