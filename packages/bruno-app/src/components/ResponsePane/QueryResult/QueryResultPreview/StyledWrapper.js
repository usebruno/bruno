import styled from 'styled-components';

const StyledWrapper = styled.div`
  .no-preview-heading {
    color: ${(props) => props.theme.queryResultPreview.noPreview.heading};
  }

  .no-preview-text {
    color: ${(props) => props.theme.queryResultPreview.noPreview.text};
  }
`;

export default StyledWrapper;
