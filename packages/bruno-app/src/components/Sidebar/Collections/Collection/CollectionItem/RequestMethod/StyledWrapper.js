import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.6875rem;
  display: flex;
  align-self: stretch;
  align-items: center;
  min-width: 34px;

  span {
    position: relative;
    top: 1px;
  }

  .method-get {
    color: var(--color-method-get);
  }
  .method-post {
    color: var(--color-method-post);
  }
  .method-put {
    color: var(--color-method-put);
  }
  .method-delete {
    color: var(--color-method-delete);
  }
  .method-patch {
    color: var(--color-method-patch);
  }
  .method-options {
    color: var(--color-method-options);
  }
  .method-head {
    color: var(--color-method-head);
  }
`;

export default Wrapper;
