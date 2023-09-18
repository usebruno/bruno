import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.75rem;
  font-weight: 600;

  &.text-ok {
    color: ${(props) => props.theme.requestTabPanel.responseOk};
  }

  &.text-error {
    color: ${(props) => props.theme.requestTabPanel.responseError};
  }
`;

export default Wrapper;
