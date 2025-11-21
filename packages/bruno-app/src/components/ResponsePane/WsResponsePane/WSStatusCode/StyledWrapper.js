import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: var(--font-size-sm);
  font-weight: 600;
  display: flex;
  align-items: center;

  &.text-ok {
    color: ${(props) => props.theme.requestTabPanel.responseOk};
  }

  &.text-pending {
    color: ${(props) => props.theme.requestTabPanel.responsePending};
  }

  &.text-error {
    color: ${(props) => props.theme.requestTabPanel.responseError};
  }
`;

export default Wrapper;
