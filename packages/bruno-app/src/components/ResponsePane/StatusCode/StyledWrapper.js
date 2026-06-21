import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.sm};
  font-weight: 600;
  white-space: nowrap;

  &.text-ok {
    color: ${(props) => props.theme.requestTabPanel.responseOk};
  }

  &.text-error {
    color: ${(props) => props.theme.requestTabPanel.responseError};
  }

  &.text-redirect {
    color: ${(props) => props.theme.requestTabPanel.responseRedirect};
  }

  &.text-client-error {
    color: ${(props) => props.theme.requestTabPanel.responseClientError};
  }
`;

export default Wrapper;
