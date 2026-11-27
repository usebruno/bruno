import styled from 'styled-components';

const StyledWrapper = styled.div`
  .source-approval-description,
  .source-approval-interval {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .source-approval-url {
    background: ${(props) => props.theme.background.mantle};
    color: ${(props) => props.theme.text};
  }

  .source-approval-warning {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.warning};
  }
`;

export default StyledWrapper;
