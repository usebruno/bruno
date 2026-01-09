import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .api-key-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .api-key-input {
    padding-right: 2.5rem;
  }

  .toggle-visibility-btn {
    position: absolute;
    right: 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    color: ${(props) => props.theme.text};
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }
`;

export default StyledWrapper;
