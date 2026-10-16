import styled from 'styled-components';

const StyledWrapper = styled.span`
  display: flex;
  align-items: center;
  font-size: 12px;

  .keycap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 12px;
    height: 15px;
    font-size: 12px;
    line-height: 1;
  }
`;

export default StyledWrapper;
