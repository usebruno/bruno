import styled from 'styled-components';

const StyledWrapper = styled.div`
  .scope-row {
    gap: 0.375rem;
    min-height: 1.5rem;
    margin-top: 0;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
  }
`;

export default StyledWrapper;
