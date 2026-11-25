import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  background: ${(props) => rgba(props.theme.colors.text.warning, 0.07)};
  border: 1px solid ${(props) => rgba(props.theme.colors.text.warning, 0.22)};

  .source-approval-icon {
    color: ${(props) => props.theme.colors.text.warning};
  }

  .source-approval-title {
    color: ${(props) => props.theme.text};
  }

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
