import styled from 'styled-components';

const Wrapper = styled.div`
.tab-container {
  background-color: ${props => props.theme.grpc.tabNav.container.bg};
}
.tab-button {
  background-color: ${props => props.theme.grpc.tabNav.button.inactive.bg};
  color: ${props => props.theme.grpc.tabNav.button.inactive.color};
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  
  &:hover {
    background-color: ${props => props.theme.grpc.tabNav.button.inactive.hover};
  }
  
  &.active {
    background-color: ${props => props.theme.grpc.tabNav.button.active.bg};
    color: ${props => props.theme.grpc.tabNav.button.active.color};
  }
}
`;

export default Wrapper;
