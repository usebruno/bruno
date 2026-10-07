import styled from 'styled-components';

const Wrapper = styled.div`
  .empty-cta-message {
    display: flex;
    align-items: center;
    height: 1.6rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.sidebar.muted};

    .add-request-link {
      color: ${(props) => props.theme.textLink};
      cursor: pointer;
    }
  }

  .indent-block {
    border-right: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
  }
`;

export default Wrapper;
