import styled from 'styled-components';

const StyledWrapper = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: ${(props) => props.theme.border.radius.sm};
  color: ${(props) => props.theme.colors.text.muted};
  transition: color 0.15s ease;

  &:hover {
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
