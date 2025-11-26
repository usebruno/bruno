import styled from 'styled-components';

const Wrapper = styled.div`
  .bruno-modal-content {
    padding-bottom: 1rem;
  }
  .warning {
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default Wrapper;
