import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: 0.8125rem;
  color: ${(props) => props.theme.codemirror.variable.info.iconColor};
  border-radius: 4px;

  &:hover {
    background-color: ${(props) => props.theme.workspace.button.bg};
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
