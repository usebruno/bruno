import styled from 'styled-components';

const StyledWrapper = styled.div`
  border-left: 1px solid ${(props) => props.theme.rightPane.border};
  padding-top: 2em;
  height: 100%;
`;

export default StyledWrapper;
