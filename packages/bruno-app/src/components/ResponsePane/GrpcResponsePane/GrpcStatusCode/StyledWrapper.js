import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.sm};
  font-weight: 500;
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