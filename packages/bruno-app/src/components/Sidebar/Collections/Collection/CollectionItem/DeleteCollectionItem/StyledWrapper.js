import styled from 'styled-components';

const Wrapper = styled.div`
  button.submit {
    color: white;
    background-color: var(--color-background-danger) !important;
    border: inherit !important;

    &:hover {
      border: inherit !important;
    }
  }

  .delete-item-name {
    overflow-wrap: anywhere;
  }
`;

export default Wrapper;
