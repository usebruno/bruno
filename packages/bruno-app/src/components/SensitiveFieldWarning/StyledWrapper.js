import styled from 'styled-components';

const Wrapper = styled.div`
  .tooltip-mod {
    font-size: ${(props) => props.theme.font.size.xs} !important;
    width: 150px !important;
  }

  .tooltip-icon { 
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default Wrapper;
