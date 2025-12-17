import styled from 'styled-components';

const StyledWrapper = styled.div`
  .api-specs-badge {
    margin-inline: 0.5rem;
    background-color: ${(props) => props.theme.sidebar.badge.bg};
    border-radius: 5px;
  }
`;

export default StyledWrapper;
