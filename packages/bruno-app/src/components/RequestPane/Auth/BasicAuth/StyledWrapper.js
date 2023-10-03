import styled from 'styled-components';

const Wrapper = styled.div`
  .single-line-editor-wrapper {
    padding: 0.15rem 0.4rem;
    border: ${(props) => props.theme.sidebar.search.border};
  }
`;

export default Wrapper;
