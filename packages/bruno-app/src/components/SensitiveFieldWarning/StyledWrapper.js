import styled from 'styled-components';

const Wrapper = styled.div`
  .tooltip-mod {
    width: 150px !important;
  }

  .tooltip-icon { 
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default Wrapper;
