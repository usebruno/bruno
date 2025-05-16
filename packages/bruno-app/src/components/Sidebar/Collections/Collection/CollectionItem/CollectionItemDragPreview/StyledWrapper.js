import styled from 'styled-components';

const StyledWrapper = styled.div`
  .drag-preview {
    background-color: ${(props) => props.theme.sidebar.collection.item.hoverBg};
  }
`;

export default StyledWrapper;
