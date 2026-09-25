import styled from 'styled-components';

const StyledWrapper = styled.div`
  .some-tests-failed {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .all-tests-passed {
    color: ${(props) => props.theme.colors.text.green};
  }
`;

export default StyledWrapper;
