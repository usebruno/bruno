import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 20.5rem;
  padding: 0.75rem;
  font-size: ${(props) => props.theme.font.size.sm};
  color: ${(props) => props.theme.dropdown.color};
  background: ${(props) => props.theme.dropdown.bg};
  border: ${(props) => (props.theme.dropdown.border === 'none' ? 'none' : `1px solid ${props.theme.dropdown.border}`)};
  border-radius: ${(props) => props.theme.border.radius.md};
  box-shadow: ${(props) => props.theme.dropdown.shadow};

  .form-title,
  .save-to-title {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .textbox {
    color: ${(props) => props.theme.text};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
  }

  .source-badge {
    flex-shrink: 0;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .source-badge-label {
    font-weight: 600;
  }

  .form-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
  }

  .save-to-list {
    margin-top: -0.5rem;
  }
`;

export default StyledWrapper;
