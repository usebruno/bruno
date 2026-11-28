import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: ${(props) => props.theme.background.base};
  border: 1px solid ${(props) => props.theme.border.subtle};
  border-radius: ${(props) => props.theme.border.radius.base};

  .warning-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.warning};
  }

  .warning-message {
    flex: 1;
    min-width: 0;
    line-height: 1.25rem;
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
