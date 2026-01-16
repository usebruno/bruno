import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;

  .integration-panel {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .integration-panel-title {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    color: ${(props) => props.theme.sidebar.muted};
    padding: 0 4px;
  }
`;

export default StyledWrapper;
