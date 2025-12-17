import styled from 'styled-components';

const StyledWrapper = styled.div`
  .collection-info-card {
    background-color: ${(props) => props.theme.modal.title.bg};
    border: 1px solid ${(props) => props.theme.modal.header.borderBottom};
    border-radius: 4px;
    padding: 12px;
  }

  .collection-name {
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 4px;

    &:hover {
      background: none;
    }
  }

  .collection-path {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    word-break: break-all;
  }
`;

export default StyledWrapper;
