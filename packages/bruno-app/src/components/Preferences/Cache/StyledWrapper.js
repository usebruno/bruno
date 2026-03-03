import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};
  
  form.bruno-form {
    label {
      font-size: 0.8125rem;
    }
  }
`;

export default StyledWrapper;
