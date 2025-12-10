import styled from 'styled-components';

const StyledWrapper = styled.div`
    .active {
      color: ${(props) => props.theme.colors.text.yellow};
    }

    .preview-response-tab-label {
      color: ${(props) => props.theme.colors.text.muted};
    }
`;

export default StyledWrapper;
