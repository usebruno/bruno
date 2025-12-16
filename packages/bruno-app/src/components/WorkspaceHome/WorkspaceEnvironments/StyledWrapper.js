import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.bg};
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
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
  
  .shared-button {
    padding: 5px 10px;
    font-size: 12px;
    border-radius: 5px;
    border: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
    background: ${(props) => props.theme.sidebar.bg};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: all 0.1s ease;
    
    &:hover {
      background: ${(props) => props.theme.listItem.hoverBg};
      border-color: ${(props) => props.theme.textLink};
    }
  }
`;

export default StyledWrapper;
