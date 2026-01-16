import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: ${(props) => props.theme.bg};
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 10%;
    color: ${(props) => props.theme.colors.text.muted};
    
    svg {
      opacity: 0.3;
      margin-bottom: 8px;
    }
    
    .title {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 12px;
      color: ${(props) => props.theme.colors.text.muted};
    }
    
    .actions {
      display: flex;
      gap: 8px;
    }
  }
`;

export default StyledWrapper;
