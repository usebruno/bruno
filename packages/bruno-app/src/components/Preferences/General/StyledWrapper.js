import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  
  color: ${(props) => props.theme.text};

  .text-link {
    color: ${(props) => props.theme.colors.text.link};
    text-decoration: none;
    font-size: 0.8125rem;

    &:hover {
      text-decoration: underline;
    }
  }

  form.bruno-form {
    label {
      font-size: 0.8125rem;
    }
  }

  .default-collection-location-input {
    max-width: 28rem;
  }
`;

export default StyledWrapper;
