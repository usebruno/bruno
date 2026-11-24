import styled from 'styled-components';

const StyledWrapper = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  height: 1.5rem;
  padding: 0 0.25rem;
  border-radius: ${(props) => props.theme.border.radius.sm};
  color: ${(props) => props.theme.colors.text.danger};
  font-size: ${(props) => props.theme.font.size.sm};
`;

export default StyledWrapper;
