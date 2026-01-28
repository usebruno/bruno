import styled from 'styled-components';

const StyledWrapper = styled.div`
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
`;

export default StyledWrapper;
