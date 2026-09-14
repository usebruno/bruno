import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid ${(props) => props.theme.input.border};
  border-radius: ${(props) => props.theme.border.radius.sm};
  background: ${(props) => props.theme.input.bg};
  color: ${(props) => props.theme.colors.text.muted};
  transition: border-color 0.15s;

  &:focus-within {
    border-color: ${(props) => props.theme.input.focusBorder};
  }

  input {
    width: 100%;
    min-width: 0;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.2;

    &:focus {
      outline: none;
    }

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }
  }
`;

export default StyledWrapper;
