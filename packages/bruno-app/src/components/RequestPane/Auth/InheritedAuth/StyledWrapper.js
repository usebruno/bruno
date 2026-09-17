import styled from 'styled-components';

const Wrapper = styled.div`
  .inherit-mode-text {
    color: ${(props) => props.theme.primary.text};
    background: transparent;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      opacity: 0.8;
    }
  }

  .inherited-auth-fields {
    pointer-events: none;
    cursor: not-allowed;
    opacity: 0.65;

    /* Allow expanding collapsed sections so inherited values can be viewed. */
    .auth-advanced-toggle {
      pointer-events: auto;
      cursor: pointer;
    }
  }
`;

export default Wrapper;
