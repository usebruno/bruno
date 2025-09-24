import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 350px;
  min-width: 350px;
  height: 100%;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  padding: 1.25rem;

  .editing-mode {
    cursor: pointer;
  }
`;

export default StyledWrapper;
