import styled from 'styled-components';

const StyledWrapper = styled.div`
  .auth-mode-selector {
    border: 1px solid ${({ theme }) => theme.colors.border};
    padding: 4px 8px;
    border-radius: 4px;
    font-size: ${(props) => props.theme.font.size.base};
  }

  .auth-mode-label {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export default StyledWrapper;