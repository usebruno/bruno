import styled from 'styled-components';

const StyledWrapper = styled.div`
  .CodeMirror {
    height: 100%;
    min-height: 200px;
    font-size: 13px;
    line-height: 1.5;
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.colors.border};
  }

  .diff-highlight {
    background-color: ${({ theme }) => theme.colors.highlight};
  }

  select, button {
    background: ${({ theme }) => theme.colors.surface};
    border-color: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};

    &:hover {
      border-color: ${({ theme }) => theme.colors.borderHover};
    }
  }

  .bg-blue-500 {
    background-color: ${({ theme }) => theme.colors.primary};
    &:hover {
      background-color: ${({ theme }) => theme.colors.primaryHover};
    }
  }
`;

export default StyledWrapper; 