import styled from 'styled-components';

const StyledWrapper = styled.div`
  .swagger2-sync-note {
    font-size: 0.75rem;
    color: ${(props) => props.theme.status.warning.text};
  }

  .bruno-modal-footer {
    padding-top: 0;
  }
`;

export default StyledWrapper;
