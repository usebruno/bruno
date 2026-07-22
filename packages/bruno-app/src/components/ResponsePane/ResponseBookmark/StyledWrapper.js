import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  color: ${(props) => props.theme.dropdown.iconColor};
  border-radius: 4px;

  &:hover {
    background-color: ${(props) => props.theme.workspace.button.bg};
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
