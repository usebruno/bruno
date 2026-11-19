import styled from 'styled-components';

const StyledWrapper = styled.section`
  border: 1px solid ${({ theme }) => theme.border.border1};
  border-radius: 6px;
  margin-bottom: 12px;

  .variable-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.border.border1};
  }
  .variable-heading button { margin-left: auto; }
  pre { margin: 0; padding: 12px; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.7; }
`;

export default StyledWrapper;
