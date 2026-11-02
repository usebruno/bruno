import styled from 'styled-components';

const StyledWrapper = styled.div`
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  overflow: hidden;

  &.full-pane {
    flex-grow: 1;
    margin-bottom: 0;
  }
`;

export default StyledWrapper;
