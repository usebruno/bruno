import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};
  color: ${(props) => props.theme.codemirror.variable.info.iconColor};
  border-radius: 4px;

  &:hover {
    background-color: ${(props) => props.theme.workspace.button.bg};
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
