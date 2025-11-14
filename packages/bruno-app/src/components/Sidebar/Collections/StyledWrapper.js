import styled from 'styled-components';

const Wrapper = styled.div`
  span.close-icon {
    color: ${(props) => props.theme.colors.text.muted};
  }

  &:hover .collections-badge .collections-header-actions .collection-action-button {
    opacity: 1;
  }
`;

export default Wrapper;
